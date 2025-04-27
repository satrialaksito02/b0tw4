import requests
import json
import argparse
import os

# Konfigurasi API
API_URL = 'https://app.orderkuota.com/api/v2'
HOST = 'app.orderkuota.com'
USER_AGENT = 'okhttp/4.10.0'
APP_VERSION_NAME = '23.02.01'
APP_VERSION_CODE = '230201'
APP_REG_ID = 'di309HvATsaiCppl5eDpoc:APA91bFUcTOH8h2XHdPRz2qQ5Bezn-3_TaycFcJ5pNLGWpmaxheQP9Ri0E56wLHz0_b1vcss55jbRQXZgc9loSfBdNa5nZJZVMlk7GS1JDMGyFUVvpcwXbMDg8tjKGZAurCGR4kDMDRJ'

# Fungsi untuk membuat QRIS dynamic
def create_qris(amount, auth_token, username):
    url = f"{API_URL}/get"
    headers = {
        "Host": HOST,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "auth_token": auth_token,
        "auth_username": username,
        "requests[qris_ajaib][amount]": amount,
        "app_version_name": APP_VERSION_NAME,
        "app_version_code": APP_VERSION_CODE,
        "app_reg_id": APP_REG_ID
    }
    response = requests.post(url, headers=headers, data=data)
    response_data = response.json()

    # Ekstrak URL QR code dan ID QRIS dari respons
    qrcode_url = response_data.get("qris_ajaib", {}).get("results", {}).get("qrcode_url")
    qris_id = response_data.get("qris_ajaib", {}).get("results", {}).get("id")
    return qrcode_url, qris_id

# Fungsi untuk menyimpan gambar QRIS
def save_qris_image(qrcode_url, qris_id):
    # Path penyimpanan file QRIS
    save_directory = "/root/whatsapp/sheet_youtube"
    file_path = os.path.join(save_directory, f"qris_{qris_id}.png")

    # Unduh dan simpan gambar QRIS
    response = requests.get(qrcode_url)
    if response.status_code == 200:
        with open(file_path, "wb") as file:
            file.write(response.content)
        print(qris_id)  # Hanya mencetak QRIS_ID
    else:
        print("Gagal mengunduh gambar QRIS")

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
    parser = argparse.ArgumentParser(description='Create QRIS dynamic.')
    parser.add_argument('amount', type=int, help='Amount for QRIS')
    args = parser.parse_args()

    amount = args.amount
    username = "laksitoadi"

    # Coba memuat token autentikasi yang sudah disimpan
    auth_token = load_auth_token()

    if auth_token:
        qrcode_url, qris_id = create_qris(amount, auth_token, username)

        if qrcode_url:
            save_qris_image(qrcode_url, qris_id)
        else:
            print("Gagal membuat QRIS dynamic.")
    else:
        print("Gagal mendapatkan auth_token.")

if __name__ == "__main__":
    main()
