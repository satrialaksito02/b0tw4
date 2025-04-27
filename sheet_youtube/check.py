import requests
import time
import json
import sys
from datetime import datetime, timedelta

# Informasi API
API_URL = "https://app.orderkuota.com/api/v2/get"
TOKEN = "2127326:439sW0h8ZxDOIlUtauJmV2EyMHgNCfc6"
USERNAME = "laksitoadi"

# Header permintaan
HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "okhttp/4.12.0",
    "Host": "app.orderkuota.com",
    "Accept-Encoding": "gzip"
}

# Payload dasar
BASE_PAYLOAD = {
    "app_reg_id": "dkYoDUVTR5CmIHfyp8_o_V%3AAPA91bENsCOvGNo9O-HN9drKfgVSbQcAzIgNqrvZ_mqtPwrGpnA6H6THGfDZYQxHtrRtKqNe7_JMeGte2oN8jX7zlFVm-hUpmnv8rhg-h47Nr_un5DX3Q_w",
    "phone_uuid": "dkYoDUVTRSCmIHfyp8_o_V",
    "phone_model": "M2007J20CG",
    "phone_android_version": "13",
    "app_version_code": "250107",
    "app_version_name": "25.01.07",
    "ui_mode": "dark",
    "auth_username": USERNAME,
    "auth_token": TOKEN,
    "requests[0]": "account"
}

def cek_pembayaran(nominal, kode_unik): # Hapus parameter start_time
    print(f"Memulai pengecekan pembayaran untuk nominal {nominal}, kode unik {kode_unik}...")

    try:
        payload = BASE_PAYLOAD.copy()
        payload.update({
            "requests[qris_history][keterangan]": "",
            "requests[qris_history][jumlah]": "",
            "requests[qris_history][page]": "1",
        })

        response = requests.post(API_URL, headers=HEADERS, data=payload)
        response.raise_for_status()
        data = response.json()

        if data.get("success") and data.get("qris_history") and data["qris_history"].get("success"):
            transactions = data["qris_history"]["results"]
            if not transactions:
                print("Tidak ada transaksi yang ditemukan.")
                return False

        now = datetime.now()
        for transaksi in transactions[:3]:
            try:
                nominal_transaksi = float(transaksi['kredit'].replace('.', '').replace(',', '.'))
                tanggal_transaksi_str = transaksi['tanggal']
                tanggal_transaksi = datetime.strptime(tanggal_transaksi_str, '%d/%m/%Y %H:%M')

                # Asumsi kode unik ditambahkan ke nominal di transaksi
                if abs(nominal_transaksi - (nominal + kode_unik)) < 0.001 and (now - tanggal_transaksi) <= timedelta(minutes=5):
                    print("\nPembayaran DITEMUKAN!")
                    print(f"Nominal: {nominal_transaksi}, Waktu: {tanggal_transaksi_str}")
                    return True
            except (KeyError, ValueError, TypeError) as e:
                print(f"Error memproses transaksi: {e}")
        return False

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Penggunaan: python check.py <nominal> <kode_unik>")
        sys.exit(1)
    else:
        try:
            nominal_input = float(sys.argv[1])
            kode_unik_input = float(sys.argv[2]) # Ubah ke float untuk fleksibilitas
            start_time = datetime.now()
            pembayaran_ditemukan = False
            while not pembayaran_ditemukan and (datetime.now() - start_time).seconds < 300:
                pembayaran_ditemukan = cek_pembayaran(nominal_input, kode_unik_input)
                if pembayaran_ditemukan:
                    break
                time.sleep(5)
            print("Selesai pengecekan pembayaran.")
        except ValueError:
            print("Nominal dan kode unik harus berupa angka.")
            sys.exit(1)
        except requests.exceptions.RequestException as e:
            print(f"Error koneksi: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)