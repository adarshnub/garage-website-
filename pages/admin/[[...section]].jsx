import {
  Admin,
  Inventory,
  Analytics,
  Enquiries,
  EditorPage,
} from "../../src/admin";
import AdminSourcing from "../../src/AdminSourcing";
import AdminAgent from "../../src/AdminAgent";
const sections = {
  inventory: Inventory,
  analytics: Analytics,
  enquiries: Enquiries,
  sourcing: AdminSourcing,
  agent: AdminAgent,
  new: EditorPage,
  edit: EditorPage,
};
export function getServerSideProps({ params, res }) {
  const [section = "inventory", id, ...extra] = params?.section || [];
  res.setHeader("Cache-Control", "private, no-store");
  if (
    !Object.hasOwn(sections, section) ||
    extra.length ||
    (section === "edit" ? !id : !!id)
  )
    return { notFound: true };
  return { props: { section, id: id || null } };
}
export default function Workspace({ section, id }) {
  const Section = sections[section];
  return (
    <Admin>
      <Section key={id || section} id={id} />
    </Admin>
  );
}
