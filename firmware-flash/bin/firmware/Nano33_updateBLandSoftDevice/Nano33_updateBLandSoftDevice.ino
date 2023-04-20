/*
 *  This sketch allows to support Soft Devices on the Arduino Nano 33 BLE (Sense).
 *  
 *  To be able to support Soft Devices, the bootloader first needs to be updated.
 *  The new bootloader is fully backwards compatible with standard sketches.
 *  -----------------------------------------------------------------------
 * 
 * INSTRUCTIONS
 * 
 *  1)  Upload this sketch on the Nano 33 BLE to download the new bootloader into the flash. 
 *      You can choose whether to update only the bootloader or the bootloader plus SoftDevice.
 *      Make a choice through the Serial monitor.
 * 
 *  2) After flashing the bootloader the sketch asks if you want to upload the SoftDevice.
 *     This is required for the OpenMV firmware to work.
 *     After completion, the board will reboot and enter the bootloader mode.
 *
 *  3) Now you can upload a sketch that uses the SoftDevice at 0x26000, using the following bossac command
 *
 *      /path/to/bossac -d --port=yourPort --offset=0x16000 -U -i -e -w /path/to/sketch.bin -R
 *
 *    Or you can still upload a standard sketch from the IDE at 0x10000. This will of course overwrite the SoftDevice.
 *    So if you want to run a SoftDevice-related sketch, always remember to upload this sketch before and re-flash the SoftDevice.
 *
 *  To create a custom SoftDevice follow this procedure:
 *
 *  1) Convert your SoftDevice binary to a SoftDevice.h .
 *    The nRF5-SDK website provides a SoftDevice.hex, so run the following commands:
 *
 *      objcopy --input-target=ihex --output-target=binary --gap-fill 0xff SoftDevice.hex SoftDevice.bin
 *      xxd -i SoftDevice.bin > SoftDevice.h
 *
 *  2) Copy the content of the generated header file to SoftDevice.h
 * 
 *  3) Run this sketch again and flash the SoftDevice.
 */

#include "FlashIAP.h"
#include "MBR.h"
#include "bootloader.h"
#include "nrf_nvmc.h"
#include "SoftDevice.h"



#define SOFTDEVICE_ADDR       (0xA0000)
#define SOFTDEVICE_INFO_ADDR  (0xFF000)
#define MBR_ADDR              (0x0)
#define BOOTLOADER_ADDR       (0xE0000)
#define UICR_BOOT_ADDR        (0x10001014)

#define BOOTLOADER_SIZE        nano33_bootloader_hex_len
const unsigned int magic = 0x5f27a93d;

mbed::FlashIAP flash;



bool hasLatestBootloader(){
  //Check if the CRC32 of the flashed bootloader
  //matches the CRC32 of the provided bootloader binary  
  uint32_t currentBootloaderCRC = getBootloaderCrcFromMemory(nano33_bootloader_hex, BOOTLOADER_SIZE);
  // Serial.print("Current bootloader 32bit CRC is: ");
  // Serial.println(currentBootloaderCRC, HEX);

  uint32_t targetBootloaderCRC = getCrcFromFlash(BOOTLOADER_ADDR, BOOTLOADER_SIZE);
  // Serial.print("Target bootloader 32bit CRC is: ");
  // Serial.println(targetBootloaderCRC, HEX);
  
  return currentBootloaderCRC == targetBootloaderCRC;
}

void readBytesFromFlash(int address, int amountOfBytes = 10){
  // Serial.print("Reading at ");
  // Serial.println(address, HEX);
  uint8_t data = 0;
  uint8_t dataSize = sizeof(data);
  int currentAddress = address;
  
  for (int i=0; i<amountOfBytes; i++) {
    //Read 8 bit from flash
    flash.read(&data, currentAddress, dataSize);
    // Serial.print("0x");
    // Serial.print(data, HEX);
    // Serial.print(" ");
    currentAddress += dataSize;
  }
  // Serial.println("");
}

bool hasSoftDevice(){
  return false;

  // TODO doesn't seem to work for now
  uint32_t currentSoftDeviceCRC = getCrcFromFlash(0x1000, Softdevice_bin_len);
  // Serial.print("Current SoftDevice 32bit CRC is: ");
  // Serial.println(currentSoftDeviceCRC, HEX);
  
  uint32_t targetSoftDeviceCRC = getCrcFromMemory(Softdevice_bin, Softdevice_bin_len);
  // Serial.print("Target SoftDevice 32bit CRC is: ");
  // Serial.println(targetSoftDeviceCRC, HEX);

  readBytesFromFlash(0xA0000);
  readBytesFromFlash(0x1000);
  readBytesFromFlash(0x10000);
  readBytesFromFlash(0x26000);
  return true;  
}


void applyUpdate(uint32_t address, const unsigned char payload[], long len, uint32_t bin_pointer = 0) {
  uint32_t flash_pointer = 0;
  const uint32_t page_size = flash.get_page_size();
  char *page_buffer = new char[page_size];
  uint32_t addr = address;

  uint32_t sector_size = flash.get_sector_size(addr);
  uint32_t next_sector = addr + sector_size;
  bool sector_erased = false;
  size_t pages_flashed = 0;
  uint32_t percent_done = 0;

  while (true) {
    
    if (flash_pointer >= len) {
      break;
    }

    flash.erase(addr + flash_pointer, sector_size);

    if ((len - flash_pointer) < sector_size) {
      sector_size = len - flash_pointer;
    }

    // Program page
    flash.program(&payload[bin_pointer], addr + flash_pointer, sector_size);
    // Serial.print("Flash Address = ");
    // Serial.println(addr + flash_pointer, HEX);
    
    bin_pointer = bin_pointer + sector_size;
    flash_pointer = flash_pointer + sector_size;

    uint32_t percent_done = flash_pointer * 100 / len;
    // Serial.println("Flashed " + String(percent_done) + "%");
  }
  // Serial.println("");

  delete[] page_buffer;
}

void updateBootloader(){
  // Serial.println("This sketch modifies the Nano33 bootloader to support Soft Devices.");
  // Serial.println("");
  
  flash.init();
  
  // Serial.println("Flashing MBR...");
  applyUpdate(MBR_ADDR, MBR_bin, MBR_bin_len);

  // Serial.println("Flashing bootloader...");
  applyUpdate(BOOTLOADER_ADDR, nano33_bootloader_hex, nano33_bootloader_hex_len);
  
  // Serial.println("Writing in UICR memory the address of the new bootloader...");
  nrf_nvmc_write_word(UICR_BOOT_ADDR, BOOTLOADER_ADDR);
  
  flash.deinit();

  // Serial.println("");
  // Serial.println("Bootloader update successfully completed! Rebooting...\n");  
}

void updateSoftDevice(){
  flash.init();

  // Serial.println("Storing SoftDevice length info at 0xFF000...");
  writeSoftDeviceLen(SOFTDEVICE_INFO_ADDR);
  
  // Serial.println("Flashing SoftDevice...");
  applyUpdate(SOFTDEVICE_ADDR, Softdevice_bin, Softdevice_bin_len - 4096, 4096);

  flash.deinit();

  // Serial.println("");
  // Serial.println("SoftDevice update complete! The board is restarting...");  
}

void setup() {  
  Serial.begin(115200);
  while (!Serial) {}
  pinMode(LED_BUILTIN, OUTPUT);

  // Read from the serial port and only continue if the magic number 1 is received
  while(Serial.read() != 1){
    delay(100);
  }

  if(!hasLatestBootloader()){
    digitalWrite(LED_BUILTIN, HIGH);
    //// Serial.println("Your bootloader version is outdated (update required for Soft Device support).");
    //// Serial.println("Updating bootloader...");
    updateBootloader();
    digitalWrite(LED_BUILTIN, LOW);
    NVIC_SystemReset();
    return;
  }
  
  if(!hasSoftDevice()){
    digitalWrite(LED_BUILTIN, HIGH);
    // Serial.println("Installing softdevice...");
    updateSoftDevice();      
    Serial.write(1);
    delay(200);
    Serial.write(1);
    delay(200);
    Serial.write(1);
    Serial.end();
    digitalWrite(LED_BUILTIN, LOW);
    delay(500);       
    NVIC_SystemReset();    
    return;
  }

  Serial.write(1);
}

uint32_t getBootloaderCrcFromMemory(const unsigned char address[], uint16_t totalSize) {
  uint32_t mask = 0;
  uint32_t crc = 0xFFFFFFFF;
  uint32_t b = 0;
  uint8_t bootByte = 0;

  int iterations = totalSize;

  for (int i=0; i<iterations; i=i+4) {
    b = 0;
    for (int j=0; j<4; j++) {
      mask = 0;
      bootByte = address[i+j];
      mask = mask + (uint32_t)bootByte;
      mask = mask << 8*j;
      b = b | mask;
    }
    crc = crc ^ b;
  }
  return crc;
}

uint32_t getCrcFromMemory(const unsigned char address[], uint16_t totalSize) {
  uint32_t data = 0;
  uint8_t dataSize = sizeof(data);  
  uint32_t crc = 0xFFFFFFFF;  

  for (size_t i = 0; i < totalSize; i += dataSize) {
      if (totalSize - i >= dataSize) {
          data =  (uint32_t) address[i]     << 24 |
                  (uint32_t) address[i + 1] << 16 |
                  (uint32_t) address[i + 2] << 8  |
                  (uint32_t) address[i + 3];          
          //Update crc
        crc = crc ^ data;
      } else {
          // Serial.println("Less than 4 bytes remaining, not enough to read into a uint32_t\n");
      }
  }
  
  return crc;
}

uint32_t getCrcFromFlash(int address, uint16_t totalSize) {
  uint32_t data = 0;
  uint8_t dataSize = sizeof(data);
  
  uint32_t crc = 0xFFFFFFFF;
  int currentAddress = address;
  int iterations = ceil(totalSize / dataSize);

  for (int i=0; i<iterations; i++) {
    //Read 32 bit from flash
    flash.read(&data, currentAddress, dataSize);
    //// Serial.println(b, HEX);
    
    //Update crc
    crc = crc ^ data;
    
    //Move address pointer to read next 4 bytes
    currentAddress += dataSize;
  }
  return crc;
}

void writeSoftDeviceLen(uint32_t address) {
  uint32_t sd_addr = SOFTDEVICE_ADDR;
  flash.erase(address, 16);
  //Write flag to let Bootloader understand that SoftDevice binary must be moved
  flash.program(&magic, address, 4);
  //Write address where the SoftDevice binary has been written
  flash.program(&sd_addr, address + 4, 4);
  //Write SoftDevice binary length
  unsigned int sd_len = Softdevice_bin_len - 4096;
  flash.program(&sd_len, address + 8, 4);
}

void loop() {
  delay(10);
}
