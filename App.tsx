// /**
//  * Sample React Native App
//  * https://github.com/facebook/react-native
//  *
//  * @format
//  */

// import { NewAppScreen } from '@react-native/new-app-screen';
// import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';

// function App() {
//   const isDarkMode = useColorScheme() === 'dark';

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
//       <NewAppScreen templateFileName="App.tsx" />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });

// export default App;



import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';
import WifiManager from 'react-native-wifi-reborn';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

// Type definitions
interface DeviceData {
  device_id: string;
  cutoff_detection: boolean;
  low_battery_indication: boolean;
  power_consumption?: number;
  timestamp?: string;
}

type ScreenType = 'setup' | 'scanning' | 'connecting' | 'monitoring';
type ActiveTabType = 'cutoff' | 'battery';

interface CircularProgressProps {
  percentage: number;
  color: string;
  children: React.ReactNode;
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('setup');
  const [activeTab, setActiveTab] = useState<ActiveTabType>('cutoff');
  const [bleManager] = useState<BleManager>(new BleManager());
  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    requestPermissions();
    return () => {
      bleManager.destroy();
    };
  }, [bleManager]);

  const requestPermissions = async (): Promise<void> => {
    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];

      try {
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        console.log('Permissions granted:', granted);
      } catch (error) {
        console.log('Permission request error:', error);
      }
    }
  };

  const scanForDevices = async (): Promise<void> => {
    setIsScanning(true);
    setScannedDevices([]);
    
    try {
      const state: State = await bleManager.state();
      if (state !== 'PoweredOn') {
        Alert.alert('Bluetooth', 'Please enable Bluetooth');
        setIsScanning(false);
        return;
      }

      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.log('Scan error:', error);
          setIsScanning(false);
          return;
        }

        if (device && device.name && device.name.includes('ESP32')) {
          setScannedDevices(prevDevices => {
            const exists = prevDevices.find(d => d.id === device.id);
            if (!exists) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        }
      });

      // Stop scanning after 10 seconds
      setTimeout(() => {
        bleManager.stopDeviceScan();
        setIsScanning(false);
      }, 10000);
    } catch (error) {
      console.log('Scan error:', error);
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device: Device): Promise<void> => {
    try {
      setCurrentScreen('connecting');
      setSelectedDevice(device);
      
      // Connect to BLE device
      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      // Configure WiFi (this would typically involve sending WiFi credentials to ESP32)
      await configureWiFi(connectedDevice);
      
      setIsConnected(true);
      setCurrentScreen('monitoring');
      
      // Start monitoring data
      startDataMonitoring(connectedDevice);
      
    } catch (error) {
      console.log('Connection error:', error);
      Alert.alert('Connection Error', 'Failed to connect to device');
      setCurrentScreen('setup');
    }
  };

  const configureWiFi = async (device: Device): Promise<void> => {
    // This is a simplified version - in reality, you'd send WiFi credentials to ESP32
    try {
      const wifiNetworks = await WifiManager.loadWifiList();
      // You would typically show a WiFi selection screen here
      // and send the selected network credentials to the ESP32
      console.log('Available WiFi networks:', wifiNetworks);
    } catch (error) {
      console.log('WiFi configuration error:', error);
    }
  };

  const startDataMonitoring = (device: Device): NodeJS.Timeout => {
    // Simulate receiving data from ESP32
    const interval = setInterval(() => {
      const mockData: DeviceData = {
        device_id: "ESP_34:CD:B0:85:8C:AC",
        cutoff_detection: Math.random() > 0.7,
        low_battery_indication: Math.random() > 0.8,
        power_consumption: Math.floor(Math.random() * 15) + 8,
        timestamp: new Date().toLocaleTimeString(),
      };
      setDeviceData(mockData);
    }, 3000);

    // Store interval reference for cleanup
    return interval;
  };

  const CircularProgress: React.FC<CircularProgressProps> = ({ percentage, color, children }) => (
    <View style={styles.circularProgressContainer}>
      <AnimatedCircularProgress
        size={200}
        width={8}
        fill={percentage}
        tintColor={color}
        backgroundColor="#f3f4f6"
        lineCap="round"
      >
        {() => children}
      </AnimatedCircularProgress>
    </View>
  );

  // Setup Screen
  if (currentScreen === 'setup') {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Add Device</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={scanForDevices}
          >
            <Text style={styles.primaryButtonText}>
              {isScanning ? 'Scanning...' : 'Scan for ESP32'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>Add Manual</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Available Devices</Text>

        <ScrollView style={styles.deviceList}>
          {isScanning && (
            <View style={styles.scanningContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.scanningText}>Scanning for ESP32 devices...</Text>
            </View>
          )}
          
          {scannedDevices.map((device: Device) => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceItem}
              onPress={() => connectToDevice(device)}
            >
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceId}>{device.id}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.bottomIndicator} />
      </View>
    );
  }

  // Connecting Screen
  if (currentScreen === 'connecting') {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Connecting to Device</Text>
        
        <View style={styles.connectingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.connectingText}>
            Connecting to {selectedDevice?.name}...
          </Text>
          <Text style={styles.connectingSubtext}>
            Configuring WiFi connection
          </Text>
        </View>
        
        <View style={styles.bottomIndicator} />
      </View>
    );
  }

  // Monitoring Screen
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome to the Device</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cutoff' && styles.activeTab]}
          onPress={() => setActiveTab('cutoff')}
        >
          <Text style={[styles.tabText, activeTab === 'cutoff' && styles.activeTabText]}>
            Cut-off detection
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'battery' && styles.activeTab]}
          onPress={() => setActiveTab('battery')}
        >
          <Text style={[styles.tabText, activeTab === 'battery' && styles.activeTabText]}>
            Battery indication
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {activeTab === 'cutoff' ? (
          <View style={styles.monitoringContent}>
            <CircularProgress
              percentage={75}
              color={deviceData?.cutoff_detection ? '#ef4444' : '#3b82f6'}
            >
              <View style={styles.progressContent}>
                <Text style={styles.powerIcon}>⚡</Text>
                <Text style={styles.powerValue}>
                  {deviceData?.power_consumption || 12}Kw
                </Text>
                <Text style={styles.timeText}>
                  {new Date().toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </CircularProgress>

            <View style={[
              styles.statusBadge,
              deviceData?.cutoff_detection ? styles.alertBadge : styles.normalBadge
            ]}>
              <Text style={[
                styles.statusText,
                deviceData?.cutoff_detection ? styles.alertText : styles.normalText
              ]}>
                {deviceData?.cutoff_detection ? 'Power Cut-off Detected' : 'Power flow is Sustainable'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.monitoringContent}>
            <CircularProgress
              percentage={deviceData?.low_battery_indication ? 25 : 85}
              color={deviceData?.low_battery_indication ? '#ef4444' : '#3b82f6'}
            >
              <View style={styles.progressContent}>
                <Text style={styles.powerIcon}>🔋</Text>
                <Text style={styles.powerValue}>
                  {deviceData?.low_battery_indication ? 'Low Charged' : 'Charged'}
                </Text>
                <Text style={styles.timeText}>
                  {new Date().toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </CircularProgress>

            <View style={[
              styles.statusBadge,
              deviceData?.low_battery_indication ? styles.alertBadge : styles.normalBadge
            ]}>
              <Text style={[
                styles.statusText,
                deviceData?.low_battery_indication ? styles.alertText : styles.normalText
              ]}>
                {deviceData?.low_battery_indication ? 'Low Battery Detected' : 'Battery is Sustainable'}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.bottomIndicator} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingTop: 50, // Account for notch
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalBars: {
    flexDirection: 'row',
    gap: 2,
    marginRight: 8,
  },
  bar: {
    width: 3,
    height: 12,
    borderRadius: 2,
  },
  barActive: {
    backgroundColor: '#000000',
  },
  barInactive: {
    backgroundColor: '#d1d5db',
  },
  batteryIcon: {
    fontSize: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
    marginVertical: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  deviceList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scanningContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  scanningText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  deviceItem: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  deviceId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  connectingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    textAlign: 'center',
  },
  connectingSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  activeTabText: {
    color: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  monitoringContent: {
    alignItems: 'center',
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  progressContent: {
    alignItems: 'center',
  },
  powerIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  powerValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  normalBadge: {
    backgroundColor: '#dcfce7',
  },
  alertBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  normalText: {
    color: '#166534',
  },
  alertText: {
    color: '#dc2626',
  },
  bottomIndicator: {
    height: 4,
    width: 128,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
});

export default App;