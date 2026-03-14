use std::collections::HashMap;
use tauri::command;

/// Proxy an HTTP (non-TLS) request from the frontend to a local AI server (e.g. LM Studio).
/// Using Rust bypasses CORS entirely — no browser preflight.
#[command]
pub async fn ai_request(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let mut req = match method.to_uppercase().as_str() {
        "POST" => client.post(&url),
        "GET" => client.get(&url),
        "PUT" => client.put(&url),
        _ => return Err(format!("Unsupported method: {method}")),
    };

    for (key, value) in &headers {
        req = req.header(key, value);
    }

    req = req.body(body);

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {e}"))?;

    if !status.is_success() {
        return Err(format!("HTTP {status}: {text}"));
    }

    Ok(text)
}
