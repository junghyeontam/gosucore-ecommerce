function submitContact() {
      const name = document.getElementById('ct-name').value.trim();
      const phone = document.getElementById('ct-phone').value.trim();
      const msg = document.getElementById('ct-msg').value.trim();
      if (!name || !phone || !msg) { alert('Vui lòng điền đầy đủ các trường bắt buộc (*)'); return; }
      document.getElementById('ct-success').style.display = 'block';
      setTimeout(() => { document.getElementById('ct-name').value = ''; document.getElementById('ct-phone').value = ''; document.getElementById('ct-email').value = ''; document.getElementById('ct-msg').value = ''; }, 300);
    }
