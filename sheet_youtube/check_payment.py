import requests
import json
import argparse
import time

# Konfigurasi API
API_URL = 'https://app.orderkuota.com/api/v2'
HOST = 'app.orderkuota.com'
USER_AGENT = 'okhttp/4.10.0'
APP_VERSION_NAME = '23.02.01'
APP_VERSION_CODE = '230201'
APP_REG_ID = 'di309HvATsaiCppl5eDpoc:APA91bFUcTOH8h2XHdPRz2qQ5Bezn-3_TaycFcJ5pNLGWpmaxheQP9Ri0E56wLHz0_b1vcss55jbRQXZgc9loSfBdNa5nZJZVMlk7GS1JDMGyFUVvpcwXbMDg8tjKGZAurCGR4kDMDRJ'

# Fungsi untuk mengecek status pembayaran QRIS
def check_payment_status(auth_token, username, qris_id):
    url = f"{API_URL}/get"
    headers = {
        "Host": HOST,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "auth_token": auth_token,
        "auth_username": username,
        "requests[qris_ajaib_history][page]": 1,
        "app_version_name": APP_VERSION_NAME,
        "app_version_code": APP_VERSION_CODE,
        "app_reg_id": APP_REG_ID
    }
    response = requests.post(url, headers=headers, data=data)
    response_data = response.json()

    # Cari status pembayaran berdasarkan ID QRIS
    for result in response_data.get("qris_ajaib_history", {}).get("results", []):
        if result.get("id") == qris_id:
            return result.get("status")

    return None

# Fungsi untuk memuat token autentikasi
def load_auth_token():
    try:
        with open('auth_token.json', 'r') as f:
            data = json.load(f)
            return data.get('auth_token')
    except FileNotFoundError:
        return None

# Fungsi utama
def main():
    parser = argparse.ArgumentParser(description='Check QRIS payment status.')
    parser.add_argument('qris_id', type=int, help='QRIS ID to check')
    args = parser.parse_args()

    qris_id = args.qris_id
    username = "laksitoadi"

    # Coba memuat token autentikasi yang sudah disimpan
    auth_token = load_auth_token()

    if auth_token:
        while True:
            payment_status = check_payment_status(auth_token, username, qris_id)
            if payment_status == "sukses":
                print("Pembayaran berhasil!")
                break
            elif payment_status == "expired":
                print("QRIS telah kadaluarsa.")
                break
            else:
                print("Menunggu pembayaran...")
                time.sleep(10)
    else:
        print("Gagal mendapatkan auth_token.")

if __name__ == "__main__":
    main()
