const edits=require('./catalog-curation.json');
const SERIES=[['fLoVccro0Mw','hezZiay9gpw','6In4U9Wb29U','GJw01sU_HS8','XNLHwXb5bMQ'],['ghgLsjpnqxg','jlxShduXXqk','01TxisqSSZI'],['o-SfiI4RIBE','Ih3nC1bIK6A','Nhn0Xr1JGJc'],['JR94k2b-wKU','a0VZoIBa5rk','ysPleL_6cMM','ymjELlYDP5Q'],['07rjdeP0Nzg','BLUFOYXjKLA','F2kdVbDCdrk']];
function curate(tables){
 const creators=tables.creators.map(c=>({...c,specialty:edits.specialty[c.name]??c.specialty}));
 // Unverified website/channel attribution is excluded until identity is resolved.
 const hidden=new Set(creators.filter(c=>c.name==='motionscript.com').map(c=>c.id));
 let videos=tables.videos.filter(v=>!edits.unavailable.includes(v.youtube_id)).map(v=>({...v,...edits.metadata[v.youtube_id],...edits.overrides[v.youtube_id]}));
 for(const fix of edits.identityCorrections){const video=videos.find(v=>v.youtube_id===fix.videoId);if(!video)continue;let creator=creators.find(c=>c.youtube_url===fix.creator.youtube_url);if(!creator){creator=fix.creator;creators.push(creator);}video.creator_id=creator.id;}
 const basic=['hb2bbfiNBXA','wmtJvH7l0mQ','K57kqOcKGMM','cxqHMp2th8I','9anmdLHV_DA','uP04ZEO7KO4'];
 // Stable library ordering is explicit. Multipart series are kept contiguous.
 videos.sort((a,b)=>(a.sort_order??1e6)-(b.sort_order??1e6)||String(a.title).localeCompare(String(b.title))||String(a.id).localeCompare(String(b.id)));
 for(const level of [...new Set(videos.map(v=>v.level))]){let list=videos.filter(v=>v.level===level);if(level==='beginner')list.sort((a,b)=>(basic.indexOf(a.youtube_id)<0?999:basic.indexOf(a.youtube_id))-(basic.indexOf(b.youtube_id)<0?999:basic.indexOf(b.youtube_id)));for(const ids of SERIES){const members=ids.map(id=>list.find(v=>v.youtube_id===id)).filter(Boolean);if(members.length<2)continue;const at=Math.min(...members.map(v=>list.indexOf(v)));list=list.filter(v=>!members.includes(v));list.splice(at,0,...members);}list.forEach((v,i)=>v.sort_order=i);}
 videos.sort((a,b)=>a.sort_order-b.sort_order);
 const ids=new Set(videos.map(v=>v.id));const playlists=tables.playlists.map(p=>({...p,video_ids:(p.video_ids||[]).filter(id=>ids.has(id)&&videos.find(v=>v.id===id)?.youtube_id!=='cCZrasEyTWk')}));
 return {...tables,videos,creators:creators.filter(c=>!hidden.has(c.id)),playlists};
}
module.exports={curate};

