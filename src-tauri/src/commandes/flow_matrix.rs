use std::sync::{Arc, Mutex};
use tauri::{State, command};

use crate::state::flow_matrix::{FlowMatrix, FlowMatrixRow};
use crate::errors::CaptureStateError;

/// Returns up to `limit` flow rows sorted by packet count descending.
/// limit = 0 means no limit (return everything).
#[command]
pub fn get_flow_matrix(
    matrix: State<'_, Arc<Mutex<FlowMatrix>>>,
    limit: usize,
) -> Result<Vec<FlowMatrixRow>, CaptureStateError> {
    let guard = matrix.lock()?;
    let mut rows = guard.to_flat_vec();
    rows.sort_by(|a, b| b.count.cmp(&a.count));
    if limit > 0 && rows.len() > limit {
        rows.truncate(limit);
    }
    Ok(rows)
}

#[command]
pub fn add_label(
    matrix: State<'_, Arc<Mutex<FlowMatrix>>>,
    mac: String,
    ip: String,
    label: String,
) -> Result<(), CaptureStateError> {
    let mut guard = matrix.lock()?;
    guard.add_label(mac, ip, label.clone());
    Ok(())
}

#[command]
pub fn get_label_list(
    matrix: State<'_, Arc<Mutex<FlowMatrix>>>,
) -> Result<Vec<String>, CaptureStateError> {
    let guard = matrix.lock()?;
    Ok(guard.get_label_list())
}
