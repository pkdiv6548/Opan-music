export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  const q=String(req.query?.q||"").trim();
  const apiKey=process.env.YOUTUBE_API_KEY;
  if(!apiKey) return res.status(500).json({error:"YOUTUBE_API_KEY is not configured.",code:"API_KEY_MISSING"});
  if(!q) return res.status(400).json({error:"Query is required.",code:"QUERY_MISSING"});
  try{
    const params=new URLSearchParams({part:"snippet",q,type:"video",videoCategoryId:"10",maxResults:"20",key:apiKey});
    const r=await fetch("https://www.googleapis.com/youtube/v3/search?"+params);
    const d=await r.json();
    if(!r.ok)return res.status(r.status).json({error:d?.error?.message||"YouTube API error.",details:d?.error});
    const items=(d.items||[]).map(x=>({id:x.id?.videoId,videoId:x.id?.videoId,title:x.snippet?.title||"Untitled",channel:x.snippet?.channelTitle||"Unknown artist",artist:x.snippet?.channelTitle||"Unknown artist",album:"YouTube Music",thumbnail:x.snippet?.thumbnails?.high?.url||x.snippet?.thumbnails?.medium?.url||x.snippet?.thumbnails?.default?.url||"",source:"youtube"})).filter(x=>x.id);
    return res.status(200).json({items,nextPageToken:d.nextPageToken||null});
  }catch(e){return res.status(500).json({error:"Failed to communicate with YouTube API.",message:e?.message||"Unknown error",code:"NETWORK_ERROR"})}
}