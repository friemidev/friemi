import { createRoot } from "react-dom/client";
import { AaSimplePreview } from "../features/aa/components/AaSimplePreview";

const mount = document.getElementById("aa-preview-root");
if (mount) createRoot(mount).render(<AaSimplePreview locale="zh-CN" />);
