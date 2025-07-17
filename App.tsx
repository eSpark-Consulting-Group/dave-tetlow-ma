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
  SafeAreaView,
} from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';
import WifiManager from 'react-native-wifi-reborn';

// Type definitions
interface DeviceData {
  device_id: string;
  cutoff_detection: boolean;
  low_battery_indication: boolean;
  timestamp?: string;
}

interface ConnectedDevice {
  id: string;
  name: string;
  data: DeviceData;
}

type ScreenType = 'setup' | 'scanning' | 'connecting' | 'monitoring';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('monitoring');
  const [bleManager] = useState<BleManager>(new BleManager());
  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  useEffect(() => {
    requestPermissions();
    return () => {
      bleManager.destroy();
    };
  }, [bleManager]);

  // Simulate multiple devices data when monitoring starts
  useEffect(() => {
    if (currentScreen === 'monitoring') {
      const interval = setInterval(() => {
        const mockDevices: ConnectedDevice[] = [
          {
            id: '265624',
            name: 'ESP32_Device_1',
            data: {
              device_id: 'ESP_34:CD:B0:85:8C:AC',
              cutoff_detection: Math.random() > 0.7,
              low_battery_indication: Math.random() > 0.6,
              timestamp: new Date().toLocaleTimeString(),
            }
          },
          {
            id: '265625',
            name: 'ESP32_Device_2',
            data: {
              device_id: 'ESP_34:CD:B0:85:8C:AD',
              cutoff_detection: Math.random() > 0.5,
              low_battery_indication: Math.random() > 0.5,
              timestamp: new Date().toLocaleTimeString(),
            }
          },
          {
            id: '265626',
            name: 'ESP32_Device_3',
            data: {
              device_id: 'ESP_34:CD:B0:85:8C:AE',
              cutoff_detection: Math.random() > 0.8,
              low_battery_indication: Math.random() > 0.8,
              timestamp: new Date().toLocaleTimeString(),
            }
          },
          {
            id: '265627',
            name: 'ESP32_Device_4',
            data: {
              device_id: 'ESP_34:CD:B0:85:8C:AF',
              cutoff_detection: Math.random() > 0.9,
              low_battery_indication: Math.random() > 0.9,
              timestamp: new Date().toLocaleTimeString(),
            }
          }
        ];
        setConnectedDevices(mockDevices);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [currentScreen]);

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
      
      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      await configureWiFi(connectedDevice);
      
      setCurrentScreen('monitoring');
      
    } catch (error) {
      console.log('Connection error:', error);
      Alert.alert('Connection Error', 'Failed to connect to device');
      setCurrentScreen('setup');
    }
  };

  const configureWiFi = async (device: Device): Promise<void> => {
    try {
      const wifiNetworks = await WifiManager.loadWifiList();
      console.log('Available WiFi networks:', wifiNetworks);
    } catch (error) {
      console.log('WiFi configuration error:', error);
    }
  };


  const StatusPill: React.FC<{ status: boolean; label: string }> = ({ status, label }) => (
    <View style={[
      styles.statusPill,
      status ? styles.statusPillTrue : styles.statusPillFalse
    ]}>
      <Text style={[
        styles.statusPillText,
        status ? styles.statusPillTextTrue : styles.statusPillTextFalse
      ]}>
        {status ? 'True' : 'False'}
      </Text>
    </View>
  );

  const DeviceCard: React.FC<{ device: ConnectedDevice }> = ({ device }) => (
    <View style={styles.deviceCard}>
      <View style={styles.deviceIdBadge}>
        <Text style={styles.deviceIdText}>Device ID_{device.id}</Text>
      </View>
      
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Power Cut-off</Text>
        <StatusPill status={device.data.cutoff_detection} label="Power Cut-off" />
      </View>
      
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Battery Low</Text>
        <StatusPill status={device.data.low_battery_indication} label="Battery Low" />
      </View>
    </View>
  );

  // Setup Screen
  if (currentScreen === 'setup') {
    return (
      <SafeAreaView style={styles.container}>
        
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
      </SafeAreaView>
    );
  }

  // Connecting Screen
  if (currentScreen === 'connecting') {
    return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  // Monitoring Screen - New Dashboard Design
  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.dashboardContent}>
        <Text style={styles.welcomeText}>Welcome to the Device</Text>
        
        <ScrollView 
          style={styles.devicesScrollView}
          showsVerticalScrollIndicator={false}
        >
          {connectedDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </ScrollView>
        
        <View style={styles.bottomIndicator} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#2d2d2d',
  },
  dashboardHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dashboardTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#9ca3af',
  },
  dashboardContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingTop: 20,
  },
  time: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signalBars: {
    flexDirection: 'row',
    gap: 2,
  },
  bar: {
    width: 3,
    height: 12,
    borderRadius: 1,
    backgroundColor: '#000000',
  },
  barActive: {
    backgroundColor: '#000000',
  },
  barInactive: {
    backgroundColor: '#d1d5db',
  },
  wifiIcon: {
    fontSize: 14,
  },
  batteryIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryBody: {
    width: 22,
    height: 11,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 2,
    backgroundColor: '#000000',
  },
  batteryTip: {
    width: 1,
    height: 6,
    backgroundColor: '#000000',
    marginLeft: 1,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000000',
    marginVertical: 30,
  },
  devicesScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  deviceCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  deviceIdBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  deviceIdText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#374151',
  },
  statusPill: {
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  statusPillTrue: {
    backgroundColor: '#ef4444',
  },
  statusPillFalse: {
    backgroundColor: '#22c55e',
  },
  statusPillText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusPillTextTrue: {
    color: '#ffffff',
  },
  statusPillTextFalse: {
    color: '#ffffff',
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
  bottomIndicator: {
    height: 4,
    width: 128,
    backgroundColor: '#000000',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
});

export default App;