import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const CRM_PAGES = ["index", "deals", "companies", "tasks", "goals", "dashboard", "reports"];

const CrmPage = () => {
  const { page } = useParams<{ page?: string }>();
  const navigate = useNavigate();
  const resolvedPage = page && CRM_PAGES.includes(page) ? page : "index";

  useEffect(() => {
    if (page && !CRM_PAGES.includes(page)) {
      navigate("/crm");
    }
  }, [page, navigate]);

  return (
    <iframe
      src={`/crm/${resolvedPage}.html`}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        display: "block",
        background: "#0d1117",
      }}
      title="CRM"
    />
  );
};

export default CrmPage;
