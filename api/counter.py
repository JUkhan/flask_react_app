import cv2
from ultralytics import YOLO
import sys
import json
import os
#import urllib.parse

#resource_dir = os.getcwd().replace('python-scripts','')

def RGB(event, x, y, flags, param):
        if event == cv2.EVENT_MOUSEMOVE :  
            colorsBGR = [x, y]
            print(colorsBGR)
            
def calculate(x, y, x1, y1, x2, y2):
    return (x-x1)*(y2-y1) - (y-y1)*(x2-x1)

def count_object(videoPath, line_p1, line_p2):
    #videoPath=os.path.join(resource_dir,'public','videos', videoPath)
    print(line_p1, line_p2, videoPath)
    model= YOLO('yolo11n.pt')
    cv2.namedWindow('RGB')
    cv2.setMouseCallback('RGB', RGB)
    #print(model.names) 1751231169225-vm.mp4
    cap=cv2.VideoCapture(videoPath)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) 
    count=-1
    allowed_classes=['car', 'bus', 'truck', 'cow']
    hist={}
    counted=set()
    car_in=0
    car_out=0
    while True:    
        ret,frame = cap.read()
        if not ret:
            break
        count += 1
        if count % 3 != 0:
            continue
        frame=cv2.resize(frame,(860,480))
        results = model.track(frame, persist=True)
        if results and results[0].boxes is not None:
            #print(results[0].boxes)
            boxes = results[0].boxes.xyxy.int().cpu().tolist()
            track_ids = results[0].boxes.id.int().cpu().tolist() if results[0].boxes.id is not None else [-1]*len(boxes)
            class_ids = results[0].boxes.cls.int().cpu().tolist() 
            
            for box, track_id, class_id in zip(boxes, track_ids, class_ids):
                class_name = model.names[class_id]
                #print(class_name)
                if class_name not in allowed_classes:
                    continue
                x1, y1, x2, y2 = map(int, box)
                cx=(x1+x2)//2
                cy=(y1+y2)//2
                cv2.rectangle(frame, (x1, y1), (x2, y2), color=(255,0,0),thickness= 2)
                if track_id in hist and track_id not in counted:
                    prev_cx, prev_cy=hist[track_id]
                    side_1=calculate(prev_cx, prev_cy, *line_p1, *line_p2)
                    side_2=calculate(cx, cy, *line_p1, *line_p2)
                    if side_1*side_2<0:
                        if side_2<0:
                            #car in
                            car_in +=1
                            print('carIn::', car_in)
                            cv2.rectangle(frame, (x1, y1), (x2, y2), color=(0,255,0),thickness= 2)
                        else:
                            car_out +=1
                            #cv2.rectangle(frame, (x1, y1), (x2, y2), color=(0,0,255),thickness= 2)
                        counted.add(track_id)
                    

                #print(f'x1:{x1}, y1:{y1}, x2:{x2} y2:{y2}, center({cx}, {cy}), id:{track_id} name:{class_name}')
                
                cv2.line(frame, line_p1, line_p2, color=(0, 255, 255), thickness=2)
                cv2.putText(frame,f'count in:{car_in}',(100,100),cv2.FONT_HERSHEY_COMPLEX,3,(0,255,255),2)
                #cv2.putText(frame,f'count out:{car_out}',(100,200),cv2.FONT_HERSHEY_COMPLEX,3,(0,255,255),2)
                hist[track_id]=(cx, cy)
                
        #print(hist)
        cv2.imshow("RGB", frame)
        yield json.dumps({"in":car_in, "out":car_out,"end":False, "totalFrames":frame_count, "currentFrame":count})
        if cv2.waitKey(1)&0xFF==27:
            break
    yield json.dumps({"in":car_in, "out":car_out,"end":True,"totalFrames":frame_count, "currentFrame":count})
    #print('Total car out: ', car_out)
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    video='D:\\animal-recogniger\\public\videos\\1751342537992-vm.mp4'
    line='5,218,856,204'
    x1,y1,x2,y2=map(int, line.split(','))
    for res in count_object(video, (x1,y1), (x2,y2)):
        print(res) 
         
         
         
    # arguments = sys.argv[1:]  # Get arguments passed from Node.js
    # if len(arguments) == 2:
    #   fileName = os.path.join(resource_dir,'public','videos', arguments[0])
    #   lineText = arguments[1]
    #   x1,y1,x2,y2=map(int, lineText.split(','))
    #   json.dumps({"line":lineText,"fileName":fileName})
    #   counter(fileName, (x1,y1), (x2,y2))
    # else:
    #   print(json.dumps({"error": "Insufficient arguments provided"})) # Always return valid JSON