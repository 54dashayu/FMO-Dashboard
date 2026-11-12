import Capacitor
import UIKit

class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        // Keep iOS location reporting disabled as in the published 2.06.1.
        // Do not instantiate CLLocationManager while the Capacitor bridge loads.
    }
}
