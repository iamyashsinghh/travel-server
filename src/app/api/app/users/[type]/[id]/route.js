export async function GET(req, { params }) {
    const { type, id } = params;
    
    return Response.json({ type, id });
}


export async function POST(req, { params }) {
    const { type, id } = params;
    
    return Response.json({ type, id });
}
