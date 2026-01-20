# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for CubbyScore Backend

import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Collect all hidden imports
hidden_imports = [
    'uvicorn.logging',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    'email.mime.multipart',
    'email.mime.text',
    'email.mime.base',
    # FastAPI
    'fastapi',
    'starlette',
    'pydantic',
    # Music21
    'music21',
    'music21.converter',
    'music21.metadata',
    'music21.stream',
    'music21.note',
    'music21.clef',
    'music21.meter',
    'music21.tempo',
    # PDF processing
    'pdf2image',
    'PIL',
    'PIL.Image',
    # XML processing
    'lxml',
    'lxml.etree',
    # Misc
    'certifi',
    'multipart',
    'python_multipart',
]

# Collect music21 data files
datas = collect_data_files('music21')

# Add certifi certificates
import certifi
datas += [(certifi.where(), 'certifi')]

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'scipy',
        'pandas',
        'numpy.testing',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='cubbyscore-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
