import { BrowserWindow } from 'electron';

interface TransparencyOptions {
  colorKey?: { r: number; g: number; b: number };
  alpha?: number; // 0-255, window opacity for non-colorkey pixels
}

// Win32 constants
const GWL_EXSTYLE = -20;
const WS_EX_LAYERED = 0x00080000;
const LWA_COLORKEY = 0x00000001;
const LWA_ALPHA = 0x00000002;
const SWP_NOMOVE = 0x0002;
const SWP_NOSIZE = 0x0001;
const SWP_NOZORDER = 0x0004;
const SWP_FRAMECHANGED = 0x0020;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GetWindowLongPtrW: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SetWindowLongPtrW: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SetLayeredWindowAttributes: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SetWindowPos: any = null;

let loaded = false;

function loadWin32Api(): boolean {
  if (process.platform !== 'win32') {
    return false;
  }

  if (loaded) {
    return true;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const koffi = require('koffi');

    const user32 = koffi.load('user32.dll');

    // Use 'intptr' for HWND and LONG_PTR (pointer-sized integer)
    GetWindowLongPtrW = user32.func('__stdcall', 'GetWindowLongPtrW', 'intptr', ['intptr', 'int']);
    SetWindowLongPtrW = user32.func('__stdcall', 'SetWindowLongPtrW', 'intptr', ['intptr', 'int', 'intptr']);
    SetLayeredWindowAttributes = user32.func('__stdcall', 'SetLayeredWindowAttributes', 'int', ['intptr', 'uint32', 'uint8', 'uint32']);
    SetWindowPos = user32.func('__stdcall', 'SetWindowPos', 'int', ['intptr', 'intptr', 'int', 'int', 'int', 'int', 'uint32']);

    loaded = true;
    console.log('Win32 API loaded via koffi');
    return true;
  } catch (err) {
    console.error('Failed to load Win32 API via koffi:', err);
    return false;
  }
}

function readHwnd(buf: Buffer): number {
  // getNativeWindowHandle() returns a Buffer containing the HWND pointer bytes.
  // Extract the pointer value from the buffer.
  if (buf.length >= 8) {
    // 64-bit: read as BigUInt64 and convert to Number (HWNDs fit in safe integer range)
    return Number(buf.readBigUInt64LE(0));
  }
  // 32-bit fallback
  return buf.readUInt32LE(0);
}

function rgb(r: number, g: number, b: number): number {
  // COLORREF is 0x00BBGGRR
  return (r & 0xff) | ((g & 0xff) << 8) | ((b & 0xff) << 16);
}

export function applyTransparency(win: BrowserWindow, options?: TransparencyOptions): boolean {
  if (!loadWin32Api()) {
    console.warn('Native overlay not available on this platform');
    return false;
  }

  try {
    const hwnd = readHwnd(win.getNativeWindowHandle());

    const colorKey = options?.colorKey ?? { r: 255, g: 0, b: 255 };
    const alpha = options?.alpha ?? 128;

    // Add WS_EX_LAYERED to the window's extended style
    const exStyle = Number(GetWindowLongPtrW(hwnd, GWL_EXSTYLE));
    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, exStyle | WS_EX_LAYERED);

    // Force Windows to re-evaluate the window after style change (required by MSDN)
    SetWindowPos(hwnd, 0, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);

    // Apply color key + alpha:
    // - Pixels matching colorKey become fully transparent
    // - All other pixels get uniform alpha opacity
    const crKey = rgb(colorKey.r, colorKey.g, colorKey.b);
    const result = SetLayeredWindowAttributes(hwnd, crKey, alpha, LWA_COLORKEY | LWA_ALPHA);

    if (!result) {
      console.error('SetLayeredWindowAttributes returned false');
      return false;
    }

    console.log(`Native transparency applied: colorKey=RGB(${colorKey.r},${colorKey.g},${colorKey.b}), alpha=${alpha}`);
    return true;
  } catch (err) {
    console.error('Failed to apply native transparency:', err);
    return false;
  }
}

export function removeTransparency(win: BrowserWindow): boolean {
  if (!loadWin32Api()) {
    return false;
  }

  try {
    const hwnd = readHwnd(win.getNativeWindowHandle());

    // Remove WS_EX_LAYERED from the window's extended style
    const exStyle = Number(GetWindowLongPtrW(hwnd, GWL_EXSTYLE));
    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, exStyle & ~WS_EX_LAYERED);

    return true;
  } catch (err) {
    console.error('Failed to remove native transparency:', err);
    return false;
  }
}
