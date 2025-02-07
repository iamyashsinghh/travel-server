import AdminForm from "@/components/AdminForm";
import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";

export default function AddAdmin() {
  return (
    <>
    <Breadcrumb title="Add New Admin" />
    <AdminForm />
    </>
      
  );
}