import { cn } from "../../lib/cn.js";
import Field, { inputClasses } from "./Field.jsx";

// A single-line text field, 32px tall. Every native prop passes through (type, value, onChange, required, autoComplete...).
// label / hint / error are optional; see Field. `className` styles the <input>, `wrapperClassName` the surrounding block.
export default function Input({ label, hint, error, id, className, wrapperClassName, ...props }) {
  return (
    <Field id={id} label={label} hint={hint} error={error} className={wrapperClassName}>
      {(controlProps) => <input className={cn(inputClasses(error), "h-8", className)} {...controlProps} {...props} />}
    </Field>
  );
}
