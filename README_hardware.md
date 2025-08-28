# Hardware ESP32 - SeizureDetector

## Componentes
- ESP32 DevKit (DOIT/NodeMCU).
- (Opcional) MPU-6050 (acel/gyro) — I2C.
- Botão tátil + resistor (para simular evento de crise).
- Jumpers, protoboard, cabo USB.

## Ligações rápidas
- Botão: GPIO 0 (ou 4/5/13) -> GND (usar pull-up interno).
- MPU-6050 (quando usado): SDA->GPIO 21, SCL->GPIO 22, VCC 3.3V, GND.

## Protocolo BLE
- Service: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- Char STATUS (READ): `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
- Char SEIZURE_EVENT (NOTIFY): `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`

### Payload de evento (exemplo)
```json
{"t":1693238400,"type":"seizure","severity":1,"src":"esp32","ver":"0.1.0"}
