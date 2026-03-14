import { message, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { error } from "@tauri-apps/plugin-log";

// Function to save as CSV
export async function SaveAsCsv(
  getCurrentDate,
  niveauConfidentialite,
  installationName,
) {
  try {
    const filePath = await save({
      filters: [{ name: ".csv", extensions: ["csv"] }],
      title: "Save the flow matrix",
      defaultPath:
        `${getCurrentDate()}_${niveauConfidentialite}_${installationName}.csv`,
    });

    if (filePath) {
      await invoke("save_packets_to_csv", { file_path: filePath });
      return true; // Succès de la sauvegarde
    } else {
      return false; // Annulation ou échec
    }
  } catch (error) {
    console.error("Error saving CSV:", error);
    return false;
  }
}

// Function to save as XLSX
export async function SaveAsXlsx(
  getCurrentDate,
  niveauConfidentialite,
  installationName,
) {
  try {
    const filePath = await save({
      filters: [{ name: ".xlsx", extensions: ["xlsx"] }],
      title: "Save the flow matrix",
      defaultPath:
        `${getCurrentDate()}_${niveauConfidentialite}_${installationName}.xlsx`,
    });

    if (filePath) {
      await invoke("save_packets_to_excel", { file_path: filePath });
      return true; // Succès de la sauvegarde
    } else {
      return false; // Annulation ou échec
    }
  } catch (error) {
    console.error("Error saving XLSX:", error);
    return false;
  }
}

// Function to trigger save based on selected format
export async function triggerSave(
  selectedFormat,
  getCurrentDate,
  niveauConfidentialite,
  installationName,
) {
  let saveResult = false;

  if (selectedFormat === "csv") {
    saveResult = await SaveAsCsv(
      getCurrentDate,
      niveauConfidentialite,
      installationName,
    );
  } else if (selectedFormat === "xlsx") {
    saveResult = await SaveAsXlsx(
      getCurrentDate,
      niveauConfidentialite,
      installationName,
    );
  }

  if (saveResult) {
    await message("Save completed successfully.", {
      title: "Confirmation",
      type: "info",
    });
  } else {
    await message("Error saving file.", {
      title: "Error",
      type: "error",
    });
  }

  return saveResult; // Retourner la confirmation de la sauvegarde
}

export async function getDesktopDirPath() {
  try {
    const dir = await desktopDir();
    return dir;
  } catch (error) {
    error("Error getting app data directory: ", error);
  }
}
