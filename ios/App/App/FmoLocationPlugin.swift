import Capacitor
import CoreLocation
import Foundation

@objc(FmoLocationPlugin)
public class FmoLocationPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "FmoLocationPlugin"
    public let jsName = "FmoLocation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestBackgroundPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setFmoConfig", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentPosition", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startWatching", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopWatching", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startForegroundService", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopForegroundService", returnType: CAPPluginReturnPromise)
    ]

    private let manager = CLLocationManager()
    private var pendingPermissionCall: CAPPluginCall?
    private var pendingBackgroundPermissionCall: CAPPluginCall?
    private var pendingPositionCall: CAPPluginCall?
    private var lastLocation: CLLocation?
    private var fmoUrl = ""
    private var intervalSeconds = 600
    private var reportTimer: Timer?
    private var lastReportDate: Date?
    private var isReporting = false

    public override func load() {
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = kCLDistanceFilterNone
        manager.pausesLocationUpdatesAutomatically = false
    }

    @objc func checkPermission(_ call: CAPPluginCall) {
        call.resolve(permissionPayload())
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        let status = authorizationStatus()
        if isLocationGranted(status) {
            call.resolve(["granted": true])
            return
        }
        pendingPermissionCall = call
        DispatchQueue.main.async {
            self.manager.requestWhenInUseAuthorization()
        }
    }

    @objc func requestBackgroundPermission(_ call: CAPPluginCall) {
        let status = authorizationStatus()
        if status == .authorizedAlways {
            call.resolve(["granted": true])
            return
        }
        guard status == .authorizedWhenInUse else {
            call.resolve(["granted": false])
            return
        }
        pendingBackgroundPermissionCall = call
        DispatchQueue.main.async {
            self.manager.requestAlwaysAuthorization()
        }
    }

    @objc func setFmoConfig(_ call: CAPPluginCall) {
        fmoUrl = call.getString("url") ?? ""
        intervalSeconds = max(10, call.getInt("intervalSeconds") ?? intervalSeconds)
        call.resolve()
    }

    @objc func getCurrentPosition(_ call: CAPPluginCall) {
        guard isLocationGranted(authorizationStatus()) else {
            call.reject("Location permission not granted")
            return
        }
        if let cached = lastLocation, abs(cached.timestamp.timeIntervalSinceNow) < 60 {
            call.resolve(locationPayload(cached))
            return
        }
        pendingPositionCall = call
        DispatchQueue.main.async {
            self.manager.requestLocation()
        }
    }

    @objc func startWatching(_ call: CAPPluginCall) {
        intervalSeconds = max(1, call.getInt("intervalSeconds") ?? intervalSeconds)
        guard isLocationGranted(authorizationStatus()) else {
            call.reject("Location permission not granted")
            return
        }
        DispatchQueue.main.async {
            self.configureBackgroundUpdatesIfAllowed()
            self.manager.startUpdatingLocation()
            call.resolve()
        }
    }

    @objc func stopWatching(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if !self.isReporting {
                self.manager.stopUpdatingLocation()
            }
            call.resolve()
        }
    }

    @objc func startForegroundService(_ call: CAPPluginCall) {
        intervalSeconds = max(10, call.getInt("intervalSeconds") ?? intervalSeconds)
        isReporting = true
        DispatchQueue.main.async {
            self.configureBackgroundUpdatesIfAllowed()
            self.manager.startUpdatingLocation()
            self.scheduleReportTimer()
            self.reportCurrentLocationIfReady(reason: "启动上报")
            call.resolve()
        }
    }

    @objc func stopForegroundService(_ call: CAPPluginCall) {
        isReporting = false
        DispatchQueue.main.async {
            self.reportTimer?.invalidate()
            self.reportTimer = nil
            self.manager.stopUpdatingLocation()
            call.resolve()
        }
    }

    public func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if let call = pendingPermissionCall {
            pendingPermissionCall = nil
            call.resolve(["granted": isLocationGranted(status)])
        }
        if let call = pendingBackgroundPermissionCall {
            pendingBackgroundPermissionCall = nil
            call.resolve(["granted": status == .authorizedAlways])
        }
        if isReporting && isLocationGranted(status) {
            configureBackgroundUpdatesIfAllowed()
            manager.startUpdatingLocation()
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        lastLocation = location
        notifyListeners("location", data: [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude
        ])
        if let call = pendingPositionCall {
            pendingPositionCall = nil
            call.resolve(locationPayload(location))
        }
        if isReporting {
            let elapsed = lastReportDate.map { Date().timeIntervalSince($0) } ?? Double(intervalSeconds)
            if elapsed >= Double(intervalSeconds) {
                reportLocation(location, checkTime: formatNow())
            }
        }
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if let call = pendingPositionCall {
            pendingPositionCall = nil
            call.reject("Location request failed: \(error.localizedDescription)")
        }
        notifyReport(false, latitude: 0, longitude: 0, message: "定位失败: \(error.localizedDescription)")
    }

    private func scheduleReportTimer() {
        reportTimer?.invalidate()
        reportTimer = Timer.scheduledTimer(withTimeInterval: Double(intervalSeconds), repeats: true) { [weak self] _ in
            self?.reportCurrentLocationIfReady(reason: "定时上报")
        }
        if let reportTimer {
            RunLoop.main.add(reportTimer, forMode: .common)
        }
    }

    private func reportCurrentLocationIfReady(reason: String) {
        guard let location = lastLocation else {
            manager.requestLocation()
            notifyReport(false, latitude: 0, longitude: 0, message: "\(reason): 等待 GPS 定位")
            return
        }
        reportLocation(location, checkTime: formatNow())
    }

    private func reportLocation(_ location: CLLocation, checkTime: String) {
        guard !fmoUrl.isEmpty else {
            notifyReport(false, latitude: location.coordinate.latitude, longitude: location.coordinate.longitude, message: "未配置 FMO 地址")
            return
        }
        guard let url = URL(string: fmoUrl) else {
            notifyReport(false, latitude: location.coordinate.latitude, longitude: location.coordinate.longitude, message: "FMO 地址无效")
            return
        }

        lastReportDate = Date()
        let socket = URLSession.shared.webSocketTask(with: url)
        socket.resume()

        let body: [String: Any] = [
            "type": "config",
            "subType": "setCordinate",
            "data": [
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude
            ]
        ]

        do {
            let payload = try JSONSerialization.data(withJSONObject: body)
            let text = String(data: payload, encoding: .utf8) ?? "{}"
            socket.send(.string(text)) { [weak self] error in
                if let error {
                    self?.notifyReport(false, latitude: location.coordinate.latitude, longitude: location.coordinate.longitude, time: checkTime, message: "上报失败: \(error.localizedDescription)")
                    socket.cancel(with: .goingAway, reason: nil)
                    return
                }
                socket.receive { [weak self] _ in
                    self?.notifyReport(true, latitude: location.coordinate.latitude, longitude: location.coordinate.longitude, time: checkTime, message: "上报成功")
                    socket.cancel(with: .normalClosure, reason: nil)
                }
            }
        } catch {
            notifyReport(false, latitude: location.coordinate.latitude, longitude: location.coordinate.longitude, time: checkTime, message: "上报失败: \(error.localizedDescription)")
            socket.cancel(with: .goingAway, reason: nil)
        }
    }

    private func configureBackgroundUpdatesIfAllowed() {
        if authorizationStatus() == .authorizedAlways {
            manager.allowsBackgroundLocationUpdates = true
            manager.showsBackgroundLocationIndicator = true
        } else {
            manager.allowsBackgroundLocationUpdates = false
        }
    }

    private func authorizationStatus() -> CLAuthorizationStatus {
        if #available(iOS 14.0, *) {
            return manager.authorizationStatus
        }
        return CLLocationManager.authorizationStatus()
    }

    private func isLocationGranted(_ status: CLAuthorizationStatus) -> Bool {
        status == .authorizedWhenInUse || status == .authorizedAlways
    }

    private func permissionPayload() -> [String: Any] {
        let status = authorizationStatus()
        return [
            "granted": isLocationGranted(status),
            "notificationGranted": true,
            "backgroundGranted": status == .authorizedAlways,
            "needRationale": false
        ]
    }

    private func locationPayload(_ location: CLLocation) -> [String: Any] {
        [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy": max(location.horizontalAccuracy, 0)
        ]
    }

    private func notifyReport(_ success: Bool, latitude: Double, longitude: Double, time: String? = nil, message: String) {
        notifyListeners("reportStatus", data: [
            "success": success,
            "latitude": latitude,
            "longitude": longitude,
            "time": time ?? formatNow(),
            "message": message
        ])
    }

    private func formatNow() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        return formatter.string(from: Date())
    }
}
