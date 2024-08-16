"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Camera } from "lucide-react";
import Navbar from "../components/NavBar";
import Link from "next/link";

const schema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  dob: z.string().refine((dob) => {
    const date = new Date(dob);
    const age =
      (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 18;
  }, "You must be at least 18 years old"),
  address: z.string().min(5, "Please enter a valid address"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().length(2, "Please enter a 2-letter state code"),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  ssn: z
    .string()
    .regex(/^\d{3}-\d{2}-\d{4}$/, "Invalid SSN format (XXX-XX-XXXX)"),
  skills: z.array(z.string()).min(1, "Please select at least one skill"),
});

const skills = [
  "Handyman",
  "Painting",
  "House Help",
  "Yard Work",
  "Cleaning",
  "Moving",
  "Pet Care",
  "Errands",
];

const ZapperOnboardingPage = () => {
  const [profileImage, setProfileImage] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(schema),
  });

  const watchedSkills = watch("skills", []);

  const onSubmit = async (data) => {
    console.log(data);
    // Here you would typically send this data to your backend
    // which would then use it to create a Stripe Connected Account
    // and store the Zapper information in your database
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">
            Join ZapTasks as a Zapper
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                    <Camera size={48} className="text-gray-400" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 cursor-pointer">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label" htmlFor="firstName">
                  <span className="label-text">First Name</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  {...register("firstName")}
                  className="input input-bordered w-full bg-slate-50"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.firstName.message as string}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="lastName">
                  <span className="label-text">Last Name</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  {...register("lastName")}
                  className="input input-bordered w-full bg-slate-50"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.lastName.message as string}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label" htmlFor="email">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  id="email"
                  {...register("email")}
                  className="input input-bordered w-full bg-slate-50"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.email.message as string}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  <span className="label-text">Phone</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  {...register("phone")}
                  className="input input-bordered w-full bg-slate-50"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.phone.message as string}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="label" htmlFor="city">
                  <span className="label-text">City</span>
                </label>
                <input
                  type="text"
                  id="city"
                  {...register("city")}
                  className="input input-bordered w-full bg-slate-50"
                />
                {errors.city && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.city.message as string}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="state">
                  <span className="label-text">Province</span>
                </label>
                <input
                  type="text"
                  id="state"
                  {...register("state")}
                  className="input input-bordered w-full bg-slate-50"
                  maxLength={2}
                />
                {errors.state && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.state.message as string}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="zip">
                  <span className="label-text">Postal Code</span>
                </label>
                <input
                  type="text"
                  id="zip"
                  {...register("zip")}
                  className="input input-bordered w-full bg-slate-50"
                />
                {errors.zip && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.zip.message as string}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Skills</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-black">
                {skills.map((skill) => (
                  <label key={skill} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={skill}
                      {...register("skills")}
                      className="checkbox checkbox-primary"
                    />
                    <span>{skill}</span>
                  </label>
                ))}
              </div>
              {errors.skills && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.skills.message as string}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
              <h4 className="font-semibold mb-2">Ready to start earning?</h4>
              <p className="text-blue-600">
                By submitting this form, you agree to ZapTasks&apos;{" "}
                <Link href="/legal" className="underline">
                  Terms of Service and Privacy Policy
                </Link>
                . We&apos;ll use this information to create your Stripe
                Connected Account and get you set up as a Zapper.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                className="btn btn-primary btn-lg text-white"
              >
                Submit Application
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ZapperOnboardingPage;
