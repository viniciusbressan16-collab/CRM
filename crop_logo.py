from PIL import Image
import sys

def crop_transparency(input_path, output_path):
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()
        
        bbox = img.getbbox()
        if bbox:
            cropped_img = img.crop(bbox)
            cropped_img.save(output_path)
            print(f"Successfully cropped and saved to {output_path}")
        else:
            print("Image is fully transparent or empty.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python crop.py <input> <output>")
    else:
        crop_transparency(sys.argv[1], sys.argv[2])
