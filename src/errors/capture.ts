import { error } from "@tauri-apps/plugin-log";

export type CaptureErrorKind =
  | { kind: "interfaceNotFound"; message: string }
  | { kind: "deviceListError"; message: string }
  | { kind: "captureInitError"; message: string }
  | { kind: "channelSendError"; message: string };

export type ImportErrorKind =
  | { kind: "openFileError"; file: string; message: string }
  | { kind: "invalidPacket"; message: string }
  | { kind: "parseError"; message: string }
  | { kind: "other"; message: string };

export type CaptureStateErrorKind =
  | { kind: "io"; message: string }
  | { kind: "poisonError"; message: string }
  | { kind: "capture"; message: CaptureErrorKind }
  | { kind: "import"; message: ImportErrorKind }
  | { kind: "other"; message: string };

function showError(title: string, kind: string, message: string, detail?: string) {
  document.dispatchEvent(new CustomEvent('show-error', {
    detail: { title, kind, message, detail }
  }));
}

export async function displayCaptureError(err: unknown) {
  const captureError = err as CaptureStateErrorKind;

  if (!("kind" in captureError)) {
    showError("Capture Error", "unknown", "Unknown error.", JSON.stringify(err));
    error(`Unknown capture error: ${JSON.stringify(err)}`);
    return;
  }

  switch (captureError.kind) {
    case "io":
      showError("Capture Error", "io", "I/O error.", captureError.message);
      break;
    case "poisonError":
      showError("Capture Error", "poisonError", "Internal lock error.", captureError.message);
      break;
    case "capture": {
      const captureKind = captureError.message as CaptureErrorKind;
      if ("kind" in captureKind) {
        switch (captureKind.kind) {
          case "interfaceNotFound":
            showError("Capture Error", "interfaceNotFound", "Network interface not found.", captureKind.message);
            break;
          case "deviceListError":
            showError("Capture Error", "deviceListError", "Unable to list network interfaces.", captureKind.message);
            break;
          case "captureInitError":
            showError("Capture Error", "captureInitError", "Capture initialization failed.", captureKind.message);
            break;
          case "channelSendError":
            showError("Capture Error", "channelSendError", "Error sending on capture channel.", captureKind.message);
            break;
        }
      }
      break;
    }
    case "import": {
      const importKind = captureError.message as ImportErrorKind;
      showError("Import Error", importKind?.kind ?? "import", handleImportError(importKind));
      break;
    }
    case "other":
      showError("Error", "other", "Unexpected error.", captureError.message);
      break;
  }

  error(`Capture error (${captureError.kind})`);
}

function handleImportError(importError: ImportErrorKind): string {
  if (
    !importError || typeof importError !== "object" || !("kind" in importError)
  ) {
    return `Unknown import error: ${JSON.stringify(importError)}`;
  }

  switch (importError.kind) {
    case "openFileError":
      return `Unable to open file ${importError.file}: ${importError.message}`;
    case "invalidPacket":
      return `Invalid packet: ${importError.message}`;
    case "parseError":
      return `Parse error: ${importError.message}`;
    case "other":
      return `Import error: ${importError.message}`;
    default:
      return `Unknown import error: ${JSON.stringify(importError)}`;
  }
}
