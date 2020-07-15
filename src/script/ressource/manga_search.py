"""
Manga_search : manga information finder on internet

Usage : python<version> manga_search.py [manga_name] <folder_name>

Default values :
    folder_name : current working directory

Option :
    -f : force to research manga, even if he is already exist on your computer

Exit code signification :
    0 : the script ended normaly
    1 : not enouth arguments
    2 : path not exist
    3 : manga information already on local storage
    4 : manga doesent exist

Source : Nautiljon
"""


import requests
import json
from bs4 import BeautifulSoup
import os
from unidecode import unidecode


if len(os.sys.argv) < 2:
    os.sys.exit(1)

if len(os.sys.argv) > 2:
    if not os.path.exists(os.sys.argv[2]):
        os.sys.exit(2)
    local_path = os.sys.argv[2] + '/'
else:
    local_path = ''

if os.path.exists(local_path + os.sys.argv[1]) and "-f" not in os.sys.argv:
    os.sys.exit(3)


URL = "https://www.nautiljon.com"

dico_all = {}

dico_all["manga_name"] = os.sys.argv[1]

full_request = URL + "/mangas/" + dico_all["manga_name"] + ".html"

r = requests.get(full_request)

# Problème : encodage des caractères non ascii (é deviens %C3%A9 ...)


def find_(request):
    soup = BeautifulSoup(request.text, features="html.parser")
    img_path = soup.find(
        "img", {"itemprop": "image"})

    img_path_str = img_path.get("src")

    with open(f'{local_path}{dico_all["manga_name"]}/img.jpg', 'wb') as image:
        r_image = requests.get(URL + img_path_str)
        image.write(r_image.content)

    dico_all["synopsis"] = soup.find("div", {"class": "description"}).text

    with open(f'{local_path}{dico_all["manga_name"]}/data.json', 'w') as json_data:
        json_data.write(json.dumps(
            {"synopsis": unidecode(dico_all["synopsis"])}, indent=4))
    dico_all["name"] = (
        (soup.find("li", {"class": "first"}).text).split(":")[1])[2:]
    return img_path_str


def verify_(request):
    if "e=404" in request.url:
        os.sys.exit(4)


def main_funct(request):
    verify_(request)
    if not os.path.exists(f'{local_path}{dico_all["manga_name"]}'):
        os.mkdir(f'{local_path}{dico_all["manga_name"]}')
    dico_all["img_path"] = URL + find_(r)
    with open(f'{local_path}{dico_all["manga_name"]}/user_data.json', 'w') as user_data:
        user_data.write(json.dumps(
            {"img_path": dico_all["img_path"], "request_path": full_request}, indent=4))


main_funct(r)

os.sys.exit(0)
