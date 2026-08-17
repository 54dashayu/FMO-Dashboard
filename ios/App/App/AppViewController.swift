import Capacitor
import UIKit

class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(FmoLocationPlugin())
    }
}
