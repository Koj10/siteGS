  const img = document.getElementById('ghonse');
  let scale = 1;
  let direction = 0.0005;

  function animate() {
    scale += direction;

    if (scale >= 1.1 || scale <= 0.9) {
      direction *= -1;
    }

    img.style.transform = `scale(${scale})`;

    requestAnimationFrame(animate);
  }
  animate();