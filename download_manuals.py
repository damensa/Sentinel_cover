import os
import requests
import time
import random
import urllib3

# Suppress insecure request warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

PDF_URLS = [
    ("Baxi", "https://triangularsa.com.ar/wp-content/uploads/2019/05/Manual-BAXI_ECO_NOVA.pdf"),
    ("Vaillant", "https://www.vaillant.es/downloads/manuales-de-instrucciones/estancas-bajo-nox/manual-de-usuario-turbotec-plus-turbotec-pro-98642.pdf"),
    ("Saunier Duval", "https://www.saunierduval.es/downloads/v-es-manual-usuario-thema-condens-20210217-2139070.pdf"),
    ("Baxi", "https://www.centralheating.co.nz/nz-content/uploads/2016/11/Luna3-Comfort-Installation-Manual.pdf"),
    ("Wolf", "https://www.wolf.eu/fileadmin/WOLF_Produkte/Heizung/Service/Betriebsanleitungen/FGB-24_28_Betriebsanleitung_fuer_den_Benutzer.pdf"),
]

SAVE_DIR = "manuals_calderas"

def setup():
    if not os.path.exists(SAVE_DIR):
        os.makedirs(SAVE_DIR)
    print(f"Directory: {SAVE_DIR}")

def download_file(url, brand):
    try:
        filename = url.split("/")[-1]
        if not filename.endswith(".pdf"):
            filename += ".pdf"
        
        path = os.path.join(SAVE_DIR, f"{brand}_{filename}")
        
        if os.path.exists(path):
            print(f"Skipping {filename} (exists)")
            return True

        print(f"Downloading {url}...")
        response = requests.get(url, stream=True, timeout=25, verify=False, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        response.raise_for_status()
        
        with open(path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Success: {brand}_{filename}")
        return True
    except Exception as e:
        print(f"Failed {url}: {e}")
        return False

def main():
    setup()
    for brand, url in PDF_URLS:
        download_file(url, brand)
        time.sleep(random.uniform(1, 2))

if __name__ == "__main__":
    main()

def main():
    setup()
    for brand, url in PDF_URLS:
        download_file(url, brand)
        time.sleep(random.uniform(1, 3)) # Polite delay

if __name__ == "__main__":
    main()

if __name__ == "__main__":
    main()
