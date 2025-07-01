import os
import cv2
import uuid

#resource_dir = os.getcwd()

def create_image(video_path, uploadFolder):
   cap=cv2.VideoCapture(video_path)
   ret,frame = cap.read()
   file_name=f"{uuid.uuid4().hex}.jpg"
   file_path=os.path.join(uploadFolder, file_name)
   cv2.imwrite(file_path, frame)
   cap.release()
   return file_name

if __name__ == "__main__":
    video='D:\\animal-recogniger\\public\\videos\\1751341684607-vm.mp4'
    
    print(create_image(video))