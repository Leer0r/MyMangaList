from cx_Freeze import setup, Executable
import sys

build_exe_options = {"packages": ["os"], "excludes": ["tkinter"]}

base = None
if sys.platform == "win32":
    base = "Win32GUI"

setup(name="manga_search",
      version="1.0",
      description="Manga_finder",
      options={"build_exe": build_exe_options},
      executables=[Executable("manga_search.py", base=base)])
