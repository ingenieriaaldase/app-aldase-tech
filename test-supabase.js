import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efssznparurlomszpssh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmc3N6bnBhcnVybG9tc3pwc3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTgwMDEsImV4cCI6MjA4NDU5NDAwMX0.j6j7QNmkeXzNToXYXLY-3M3wpmOsNYOlRGpJevWSL68';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    // 1. Get a project ID
    const { data: projects, error: projectsError } = await supabase.from('projects').select('id, name').limit(1);

    if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        return;
    }

    if (!projects || projects.length === 0) {
        console.error('No projects found');
        return;
    }

    const projectId = projects[0].id;
    console.log('Found Project:', projects[0].name, 'ID:', projectId);

    // 2. Try inserting
    console.log('Attempting insert...');
    const payload = {
        project_id: projectId,
        text: 'Test content from node',
        type: 'AVANCE',
        author_id: null,
        is_resolved: false
    };

    const { data, error } = await supabase.from('project_notes').insert(payload).select();

    console.log('Insert Result Error:', error);
    console.log('Insert Result Data:', data);

    if (!error && data) {
        // Cleanup
        await supabase.from('project_notes').delete().eq('id', data[0].id);
    }
}

test();
