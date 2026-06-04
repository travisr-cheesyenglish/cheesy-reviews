import { useEffect, useId, useState } from "react";
import {
  getCountryFlag,
  getCountryName,
  listCountrySuggestions,
  normalizeCountryCode,
  resolveCountryInput,
} from "./data/countryMeta";

const SUGGESTIONS = listCountrySuggestions();

export function CountryNameField({ value, onChange }) {
  const listId = useId();
  const code = normalizeCountryCode(value);
  const [text, setText] = useState(() => (code ? getCountryName(code) : ""));

  // Sync from parent when a saved country code is loaded (not while clearing mid-edit).
  useEffect(() => {
    if (code) setText(getCountryName(code));
  }, [code]);

  const commit = (raw) => {
    const resolved = resolveCountryInput(raw);
    onChange(resolved.code);
    setText(resolved.code ? resolved.name : raw.trim());
  };

  const datalistPick = SUGGESTIONS.find((s) => s.label === text);
  const committed = code && text === getCountryName(code);
  const previewCode = datalistPick?.code || (committed ? code : "");
  const previewFlag = previewCode ? getCountryFlag(previewCode) : "";
  const previewName = previewCode ? getCountryName(previewCode) : "";

  return (
    <div className="edit-country-field">
      <input
        className="edit-input"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          const pick = SUGGESTIONS.find((s) => s.label === v);
          if (pick) {
            onChange(pick.code);
            return;
          }
          if (code && v !== getCountryName(code)) {
            onChange("");
          }
        }}
        onBlur={() => commit(text)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(text);
          }
        }}
        list={listId}
        placeholder="Type country, e.g. Austria"
        autoComplete="off"
      />
      <datalist id={listId}>
        {SUGGESTIONS.map((row) => (
          <option key={row.code} value={row.label} />
        ))}
      </datalist>
      {previewCode ? (
        <span className="edit-country-preview" title={previewCode}>
          {previewFlag ? <span aria-hidden>{previewFlag} </span> : null}
          {previewName}
          <span className="edit-country-preview-code"> ({previewCode})</span>
        </span>
      ) : text.trim() ? (
        <span className="edit-country-preview edit-country-preview--warn">
          Finish typing, pick from the list, or press Tab / Enter to confirm
        </span>
      ) : null}
    </div>
  );
}
