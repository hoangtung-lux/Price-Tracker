import urllib.request
import zipfile
import io
import os

url = 'https://clients2.google.com/service/update2/crx?response=redirect&prodversion=114.0.0.0&acceptformat=crx2,crx3&x=id%3Dhlcigapfajpfdkiocifelpideodonbjj%26uc'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
res = urllib.request.urlopen(req).read()

with open('extension.crx', 'wb') as f:
    f.write(res)

print("Downloaded extension.crx")

# A CRX3 file is just a ZIP file with a custom header. 
# We can find the standard ZIP signature "PK\x03\x04" and extract from there.
start = res.find(b'PK\x03\x04')
if start != -1:
    zip_data = res[start:]
    os.makedirs('extension_extracted', exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
        z.extractall('extension_extracted')
    print("Extracted successfully.")
else:
    print("Zip header not found.")
