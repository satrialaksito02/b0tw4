import random
import qrcode
import sys
import os
import datetime

def char_code_at(s, i):
    return ord(s[i])

def convert_crc16(data):
    crc = 0xFFFF
    for char in data:
        crc ^= ord(char) << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc = crc << 1
    hex_crc = hex(crc & 0xFFFF)[2:].upper().zfill(4)
    return hex_crc

def convert_qris(qris_data, nominal):
    qris_data = qris_data[:-4]
    step1 = qris_data.replace("010211", "010212")
    step2 = step1.split("5802ID")

    # Generate kode unik 2 digit (00-99)
    kode_unik = random.randint(0, 99)

    # Tambahkan kode unik KE NOMINAL SEBAGAI ANGKA
    nominal_dengan_kode = nominal + kode_unik

    uang = "54" + "{:02d}".format(len(str(nominal_dengan_kode))) + str(nominal_dengan_kode)
    uang += "5802ID"

    fix = step2[0] + uang + step2[1]
    crc = convert_crc16(fix)
    result = fix + crc
    return result, nominal_dengan_kode, kode_unik

def generate_and_save_qrcode(data, filename="qrcode.png"):
    img = qrcode.make(data)
    save_directory = os.path.dirname(os.path.abspath(__file__)) # Gunakan os.path
    filepath = os.path.join(save_directory, filename)
    img.save(filepath)
    print(f"QR Code Filename: {filepath}")
    return filepath

if __name__ == "__main__":
    try:
        nominal_input = int(sys.argv[1])
        qris_data = "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214849295851316970303UMI51440014ID.CO.QRIS.WWW0215ID20253718844250303UMI5204481253033605802ID5920LX DIGITAL OK21273266008BANYUMAS61055311162070703A016304AF77"
        result, nominal_dengan_kode, kode_unik = convert_qris(qris_data, nominal_input)
        qrcode_filename = generate_and_save_qrcode(result, f"qris_{nominal_dengan_kode}.png")

        print(f"QR Code Filename: {qrcode_filename}")
        print(f"Nominal: {nominal_input}")
        print(f"Kode Unik: {kode_unik}")
        print(f"Nominal dengan Kode: {nominal_dengan_kode}")

    except ValueError:
        print("Error: Input nominal harus berupa angka!")
        print("QR Code Filename: ERROR")  # cetak pesan error
        print("Nominal: ERROR")
        print("Kode Unik: ERROR")
        print("Nominal dengan Kode: ERROR")
    except Exception as e:
        print(f"Error: Terjadi kesalahan: {e}")
        print("QR Code Filename: ERROR")  # cetak pesan error
        print("Nominal: ERROR")
        print("Kode Unik: ERROR")
        print("Nominal dengan Kode: ERROR")