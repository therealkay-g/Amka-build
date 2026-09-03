package com.amka.perception;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            }
        )
    }
)
public class ThermalPrinterPlugin extends Plugin {

    private static final UUID SERIAL_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private BluetoothSocket socket;
    private OutputStream outputStream;

    private boolean hasBtPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (hasBtPermission()) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
            return;
        }
        requestPermissionForAlias("bluetooth", call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (call == null) return;
        if (hasBtPermission()) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
        } else {
            call.reject("Permission Bluetooth refusée. Autorisez-la dans les paramètres.");
        }
    }

    @PluginMethod
    public void listDevices(PluginCall call) {
        if (!hasBtPermission()) {
            requestPermissionForAlias("bluetooth", call, "listDevicesCallback");
            return;
        }
        resolveDevices(call);
    }

    @PermissionCallback
    private void listDevicesCallback(PluginCall call) {
        if (call == null) return;
        if (hasBtPermission()) {
            resolveDevices(call);
        } else {
            call.reject("Permission Bluetooth refusée");
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("Adresse Bluetooth manquante");
            return;
        }
        if (!hasBtPermission()) {
            requestPermissionForAlias("bluetooth", call, "connectCallback");
            return;
        }
        doConnect(call, address);
    }

    @PermissionCallback
    private void connectCallback(PluginCall call) {
        if (call == null) return;
        String address = call.getString("address");
        if (hasBtPermission() && address != null) {
            doConnect(call, address);
        } else {
            call.reject("Permission Bluetooth refusée");
        }
    }

    private void resolveDevices(PluginCall call) {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            call.reject("Bluetooth non disponible");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Bluetooth désactivé. Activez-le.");
            return;
        }

        Set<BluetoothDevice> paired = adapter.getBondedDevices();
        JSONArray devicesArray = new JSONArray();
        if (paired != null) {
            for (BluetoothDevice device : paired) {
                JSONObject d = new JSONObject();
                try {
                    d.put("name", device.getName() != null ? device.getName() : "Inconnu");
                    d.put("address", device.getAddress());
                    d.put("bonded", device.getBondState() == BluetoothDevice.BOND_BONDED);
                } catch (Exception ignored) {}
                devicesArray.put(d);
            }
        }

        JSObject result = new JSObject();
        result.put("devices", devicesArray);
        call.resolve(result);
    }

    private void doConnect(PluginCall call, String address) {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Bluetooth non disponible ou désactivé");
            return;
        }

        BluetoothDevice device;
        try {
            device = adapter.getRemoteDevice(address);
        } catch (Exception e) {
            call.reject("Adresse invalide: " + address);
            return;
        }
        if (device == null) {
            call.reject("Appareil non trouvé: " + address);
            return;
        }

        final BluetoothDevice finalDevice = device;
        new Thread(() -> {
            try {
                closeConnection();
                socket = finalDevice.createRfcommSocketToServiceRecord(SERIAL_UUID);
                adapter.cancelDiscovery();
                socket.connect();
                outputStream = socket.getOutputStream();

                JSObject result = new JSObject();
                result.put("connected", true);
                result.put("name", finalDevice.getName() != null ? finalDevice.getName() : address);
                call.resolve(result);
            } catch (IOException e) {
                closeConnection();
                try {
                    socket = finalDevice.createRfcommSocketToServiceRecord(
                        UUID.fromString("00000000-0000-1000-8000-00805F9B34FB"));
                    socket.connect();
                    outputStream = socket.getOutputStream();
                    JSObject result = new JSObject();
                    result.put("connected", true);
                    result.put("name", finalDevice.getName() != null ? finalDevice.getName() : address);
                    call.resolve(result);
                } catch (IOException e2) {
                    closeConnection();
                    call.reject("Connexion échouée: " + e.getMessage());
                }
            }
        }).start();
    }

    @PluginMethod
    public void print(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) {
            call.reject("Texte vide");
            return;
        }
        if (outputStream == null || socket == null || !socket.isConnected()) {
            call.reject("Non connecté à l'imprimante");
            return;
        }
        new Thread(() -> {
            try {
                byte[] data = text.getBytes("UTF-8");
                outputStream.write(data);
                outputStream.flush();
                JSObject result = new JSObject();
                result.put("printed", true);
                call.resolve(result);
            } catch (IOException e) {
                call.reject("Erreur d'impression: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        closeConnection();
        JSObject result = new JSObject();
        result.put("disconnected", true);
        call.resolve(result);
    }

    @PluginMethod
    public void isConnected(PluginCall call) {
        JSObject result = new JSObject();
        boolean connected = socket != null && socket.isConnected();
        result.put("connected", connected);
        call.resolve(result);
    }

    private void closeConnection() {
        try { if (outputStream != null) outputStream.close(); } catch (IOException ignored) {}
        try { if (socket != null) socket.close(); } catch (IOException ignored) {}
        outputStream = null;
        socket = null;
    }
}
