ffmpeg -re -i music.mp4 -hls_time 5 \
 -hls_list_size 0 \
-hls_flags independent_segments \
 -hls_segment_filename m/%03d.ts \
-hls_base_url http://localhost:3000/segment/m/ \
 -c:v libx264 \
 -f hls m/index.m3u8
