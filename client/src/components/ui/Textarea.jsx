import { cn } from "../../lib/cn.js";
import Field, { inputClasses } from "./Field.jsx";

// A multi-line text field. Same props as Input; it grows vertically on drag and starts three rows tall.
export default function Textarea({ label, hint, error, id, rows = 3, className, wrapperClassName, ...props }) {
  return (
    <Field id={id} label={label} hint={hint} error={error} className={wrapperClassName}>
      {(controlProps) => <textarea rows={rows} className={cn(inputClasses(error), "min-h-16 resize-y py-1.5", className)} {...controlProps} {...props} />}
    </Field>
  );
}
