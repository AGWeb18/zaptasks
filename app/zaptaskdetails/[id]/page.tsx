import React from 'react';
import { ArrowLeft, Calendar, MapPin, DollarSign, Clock, Star, Shield, MessageCircle } from 'lucide-react';
import Navbar from '../../components/NavBar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';  // Usage: App router
// import BackButton from '../../components/BackButton';

// Define the Task type
type Task = {
  id: number;
  title: string;
  description: string;
  image: string;
  category: string;
  price: number;
  location: string;
  date: string;
  time: string;
  duration: string;
  provider: {
    name: string;
    rating: number;
    reviews: number;
    image: string;
  };
};

// This is an async server component
async function ZapTaskDetails({ params }: { params: { id: string } }) {
  // Fetch the task data
  const res = await fetch(`http://localhost:3000/zaptaskdetails/${params.id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch task');
  }
  const task: Task = await res.json();

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-base-200 p-8">
        <div className="max-w-5xl mx-auto">          
          <div className="card bg-base-100 shadow-xl overflow-hidden">
            <figure>
              <img src={task.image} alt={task.title} className="w-full h-60 object-cover" />
            </figure>
            <div className="card-body p-8">
              <h2 className="card-title text-3xl mb-6">{task.title}</h2>
              <div className="flex flex-wrap gap-6 my-6">
                <span className="badge badge-primary badge-lg p-4 text-lg">{task.category}</span>
                <span className="flex items-center text-lg"><MapPin size={24} className="mr-2" /> {task.location}</span>
                <span className="flex items-center text-lg"><Calendar size={24} className="mr-2" /> {task.date}</span>
                <span className="flex items-center text-lg"><Clock size={24} className="mr-2" /> {task.time} ({task.duration})</span>
                <span className="flex items-center text-lg font-bold"><DollarSign size={24} className="mr-2" /> {task.price}</span>
              </div>
              <p className="text-lg leading-relaxed mb-8">{task.description}</p>
              
              <div className="divider my-8">Service Provider</div>
              
              <div className="flex items-center space-x-6 bg-base-200 p-6 rounded-log">
                <div className="avatar">
                  <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                    <img src={task.provider.image} alt={task.provider.name} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">{task.provider.name}</h3>
                  <div className="flex items-center text-lg">
                    <Star className="text-yellow-400 mr-2" size={24} />
                    <span>{task.provider.rating} ({task.provider.reviews} reviews)</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-8">
                <div className="flex space-x-4">
                  <button className="btn btn-outline btn-primary">
                    <MessageCircle className="mr-2" /> Contact Provider
                  </button>
                  <button className="btn btn-outline">
                    <Shield className="mr-2" /> View Guarantees
                  </button>
                </div>
                <button className="btn btn-primary btn-lg">Book This Task</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ZapTaskDetails;
