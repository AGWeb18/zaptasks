import React from "react";
import { Clock } from "lucide-react";

interface TimeSelectorProps {
  value: string;
  onChange: (newTime: string) => void;
}

const TimeSelector: React.FC<TimeSelectorProps> = ({ value, onChange }) => {
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 7; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 21 && minute === 30) break; // Stop at 9:00 PM
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        const time = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        const displayTime = `${hour12}:${minute
          .toString()
          .padStart(2, "0")} ${ampm}`;
        options.push(
          <option key={time} value={time}>
            {displayTime}
          </option>
        );
      }
    }
    return options;
  };

  return (
    <div className="form-control flex-1">
      <label className="label" htmlFor="time">
        <span className="label-text">Time</span>
      </label>
      <div className="relative">
        <Clock
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50"
          size={20}
        />
        <select
          id="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="select select-bordered pl-10 w-full text-gray-900"
          required
        >
          <option value="">Select a time</option>
          {generateTimeOptions()}
        </select>
      </div>
    </div>
  );
};

export default TimeSelector;
