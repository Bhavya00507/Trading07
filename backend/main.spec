# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[('alembic', 'alembic'), ('alembic.ini', '.'), ('test.db', '.'), ('.env', '.')],
    hiddenimports=[
        'aiosqlite', 
        'sqlalchemy', 
        'fastapi', 
        'uvicorn', 
        'websockets', 
        'pyjwt', 
        'passlib', 
        'cryptography',
        'psycopg',
        'psycopg_binary',
        'email.mime.multipart',
        'email.mime.text',
        'jinja2',
        'pydantic'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

# Filter out pydantic compiled .pyd C-extensions to prevent Windows AppControl DLL blocks
a.binaries = [x for x in a.binaries if not ('pydantic' in x[0].lower() and x[0].endswith('.pyd'))]

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='backend',
)
