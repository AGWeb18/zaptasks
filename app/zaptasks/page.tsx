'use client'

import React, { useState, useEffect } from 'react';
import { Search, Filter, Hammer, PaintBucket, Shovel, Users, Trash, Car, Book, CookingPot, Dog } from 'lucide-react';
import Link from 'next/link';
import Navbar from '../components/NavBar';
import { createClient } from '@supabase/supabase-js';
// import { cookies } from 'next/headers'

type Category = {
  id: number;
  name: string;
  icon: React.ReactNode;
};

type Task = {
  id: number;
  title: string;
  description: string;
  image: string;
  category: string;
  price: number;
  location: string;
  scheduled_at: string;
};




const categories: Category[] = [
  { id: 1, name: 'Handyman', icon: <Hammer size={24} /> },
  { id: 2, name: 'Painting', icon: <PaintBucket size={24} /> },
  { id: 3, name: 'Gardening', icon: <Shovel size={24} /> },
  { id: 4, name: 'Moving', icon: <Users size={24} /> },
  { id: 5, name: 'Cleaning', icon: <Trash size={24} /> },
  { id: 6, name: 'Driving', icon: <Car size={24} /> },
  { id: 7, name: 'Tutoring', icon: <Book size={24} /> },
  { id: 8, name: 'Cooking', icon: <CookingPot size={24} /> },
  { id: 9, name: 'Pet Care', icon: <Dog size={24} /> },
];

const ZapTasksDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  // const cookieStore = cookies()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)



  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
  try {
    console.log('Fetching tasks from Supabase...');
    const { data, error } = await supabase
      .from('task')
      .select('id, title, description, image_url, category, price, location, scheduled_at');

    if (error) {
      throw error;
    }

    console.log('Raw data from Supabase:', data);

    if (!data || data.length === 0) {
      console.log('No data returned from Supabase');
      return;
    }

    const formattedTasks: Task[] = data.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      image: task.image_url,
      category: task.category,
      price: task.price,
      location: task.location,
      scheduled_at: task.scheduled_at
    }));

    setTasks(formattedTasks);
    console.log('Formatted tasks:', formattedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
  }
}

  const filteredTasks = tasks.filter(task => {
    const matchesCategory = selectedCategory ? task.category === selectedCategory : true;
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      <Navbar />
      <div className="flex h-screen bg-base-200">
        {/* Left Sidebar */}
        <aside className="w-64 bg-base-100 shadow-lg">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4 text-base-content">Filters</h2>
            <div className="space-y-2">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Available Now</span> 
                  <input type="checkbox" className="toggle toggle-primary" />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">5 Star Rating</span> 
                  <input type="checkbox" className="toggle toggle-primary" />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Low to High Price</span> 
                  <input type="checkbox" className="toggle toggle-primary" />
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Filter Pane */}
          <nav className="bg-base-100 shadow-md p-4">
            <div className="flex items-center mb-4">
              <div className="flex-1">
                <div className="form-control">
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      className="input input-bordered w-full mb-5"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-circle ml-2">
                <Filter className="h-5 w-5" />
              </button>
            </div>
            <div className="flex overflow-x-auto space-x-2 pb-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`btn btn-circle ${selectedCategory === category.name ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSelectedCategory(prevCategory => prevCategory === category.name ? null : category.name)}
                >
                  {category.icon}
                </button>
              ))}
            </div>
          </nav>

         {/* Task Cards Grid */}
         <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.length > 0 ? (
                filteredTasks.map(task => (
                  <div key={task.id} className="card bg-base-100 shadow-xl">
                    <figure className="px-4 pt-4">
                      <img src={task.image || '/placeholder-image.jpg'} alt={task.title} className="rounded-xl w-full h-48 object-cover" />
                    </figure>
                    <div className="card-body">
                      <h2 className="card-title text-base-content">{task.title}</h2>
                      <p className="text-base-content/70">{task.description}</p>
                      <p className="text-base-content/70">Price: ${task.price}</p>
                      <p className="text-base-content/70">Location: {task.location}</p>
                      <p className="text-base-content/70">Date: {new Date(task.scheduled_at).toLocaleDateString()}</p>
                      <div className="card-actions justify-end mt-4">
                      <Link href={``}>
                        <button className="btn btn-primary" ref={'/zaptaskdetails/${task.id}'}>Book Now</button>
                      </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p>No tasks found. Please try adjusting your filters.</p>
              )}
            </div>
            </div>

        </main>
      </div>
    </div>
  );
};

export default ZapTasksDashboard;