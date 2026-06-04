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

  useEffect(() => {
    setText(code ? getCountryName(code) : "");
  }, [code]);

  const commit = (raw) => {
    const resolved = resolveCountryInput(raw);
    onChange(resolved.code);
    setText(resolved.code ? resolved.name : raw.trim());
  };

  const previewFlag = code ? getCountryFlag(code) : "";
  const previewName = code ? getCountryName(code) : "";

  return (
    <div className="edit-country-field">
      <input
        className="edit-input"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          const resolved = resolveCountryInput(v);
          if (resolved.code) {
            onChange(resolved.code);
            setText(resolved.name);
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
      {code ? (
        <span className="edit-country-preview" title={code}>
          {previewFlag ? <span aria-hidden>{previewFlag} </span> : null}
          {previewName}
          <span className="edit-country-preview-code"> ({code})</span>
        </span>
      ) : text.trim() ? (
        <span className="edit-country-preview edit-country-preview--warn">
          Press Tab or click away to confirm, or pick a name from the list
        </span>
      ) : null}
    </div>
  );
}
