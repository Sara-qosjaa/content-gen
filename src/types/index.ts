export interface Slide {
  id: string;
  text: string;
  image: string;
}

export interface Post {
  id: string;
  title: string;
  audio: string;
  slides: Slide[];
}
