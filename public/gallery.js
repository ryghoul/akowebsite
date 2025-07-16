
document.addEventListener('DOMContentLoaded', () => {
  const imageFolder = 'Pictures/gallery/';
  const imageList = [
    '1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg',
    '6.jpg', '7.jpg', '8.jpg', '9.jpg', '10.jpg',
    '11.jpg', '12.jpg', '13.jpg', '14.jpg', '15.jpg',
    '16.png', '17.jpg', '18.jpg', '19.jpg', '20.jpg',
    '21.jpg', '22.jpg', '23.jpg', '24.jpg', '25.jpg'
    // Add filenames here as you drop new ones
  ];

  const galleryGrid = document.querySelector('.gallery-grid');
  imageList.forEach(filename => {
    const img = document.createElement('img');
    img.src = `${imageFolder}${filename}`;
    img.alt = 'Gallery image';
    galleryGrid.appendChild(img);
  });
});
