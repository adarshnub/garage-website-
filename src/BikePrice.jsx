import React from "react";
import { money } from "./shared";

const labels = {
  Archive: "Archived asking price",
  Sold: "Last asking price",
  Advertised: "Advertised price",
};

export default function BikePrice({ bike }) {
  const historical = bike.status === "Archive" || bike.status === "Sold";
  if (bike.price == null) {
    return (
      <div className="bike-price price-unspecified">
        {historical ? "Price unlisted" : "Price on enquiry"}
      </div>
    );
  }
  return (
    <div className={"bike-price" + (historical ? " price-historical" : "")}>
      <span className="price-label">{labels[bike.status] || "Asking price"}</span>
      <div className="price-amount">
        <strong>{money(bike.price)}</strong> <span>AUD</span>
      </div>
    </div>
  );
}
