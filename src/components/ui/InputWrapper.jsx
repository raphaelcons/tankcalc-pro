// src/components/InputWrapper.jsx
import React from "react";
import { Input as ShadcnInput } from "./input";

// Criando wrapper compatível com react-number-format
const InputWrapper = React.forwardRef(({ ...props }, ref) => {
  return <ShadcnInput ref={ref} {...props} />;
});

InputWrapper.displayName = "InputWrapper"; // importante para debug

export default InputWrapper;
