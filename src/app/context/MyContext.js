"use client";

import { createContext, useContext, useState, useEffect } from "react";

const MyContext = createContext();

export const MyContextProvider = ({ children }) => {
  const [state, setState] = useState("Hello from Context!");
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const response = await fetch("/api/admins");
        if (!response.ok) {
          throw new Error("Failed to fetch admin data");
        }
        const data = await response.json();
        setAdminData(data);
      } catch (err) {
        console.error("Error fetching admin data:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  return (
    <MyContext.Provider value={{ state, setState, adminData, loading, error }}>
      {children}
    </MyContext.Provider>
  );
};

export const useMyContext = () => useContext(MyContext);
