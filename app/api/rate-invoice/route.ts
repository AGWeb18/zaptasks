// app/api/rate-task/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';



export async function POST(request: Request) {
  console.log('Rate task API called');
  
  try {
    const { taskId, rating, comment } = await request.json();
    console.log('Received payload:', { taskId, rating, comment });

    if (!taskId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      console.log('Invalid input detected');
      return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Key is missing in environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ message: 'Error fetching user' }, { status: 500 });
    }

    if (!user) {
      console.log('User not authenticated');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.log('User authenticated:', user.id);

    // Fetch the task to get client_id and provider_id
    const { data: task, error: taskError } = await supabase
      .from('TASK')
      .select('client_id, provider_id')
      .eq('id', taskId)
      .single();

    if (taskError) {
      console.error('Error fetching task:', taskError);
      throw taskError;
    }
    console.log('Task fetched:', task);

    // Determine if the user is the client or provider
    const isClient = user.id === task.client_id;
    const isProvider = user.id === task.provider_id;

    if (!isClient && !isProvider) {
      console.log('User not authorized to review this task');
      return NextResponse.json({ message: 'Unauthorized to review this task' }, { status: 403 });
    }
    console.log('User authorization checked');

    const reviewerId = user.id;
    const revieweeId = isClient ? task.provider_id : task.client_id;

    // Check if a review already exists
    const { data: existingReview, error: reviewError } = await supabase
      .from('REVIEW')
      .select('id')
      .eq('task_id', taskId)
      .eq('reviewer_id', reviewerId)
      .single();

    if (reviewError && reviewError.code !== 'PGRST116') {
      console.error('Error checking existing review:', reviewError);
      throw reviewError;
    }
    console.log('Existing review check:', existingReview);

    let result;
    if (existingReview) {
      console.log('Updating existing review');
      // Update existing review
      result = await supabase
        .from('REVIEW')
        .update({ rating, comment })
        .eq('id', existingReview.id)
        .select()
        .single();
    } else {
      console.log('Inserting new review');
      // Insert new review
      result = await supabase
        .from('REVIEW')
        .insert({
          task_id: taskId,
          reviewer_id: reviewerId,
          reviewee_id: revieweeId,
          rating,
          comment
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error in review operation:', result.error);
      throw result.error;
    }
    console.log('Review operation successful:', result.data);

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Unhandled error in rate-task API:', error);
    return NextResponse.json({ message: 'Error updating task rating', error: String(error) }, { status: 500 });
  }
}