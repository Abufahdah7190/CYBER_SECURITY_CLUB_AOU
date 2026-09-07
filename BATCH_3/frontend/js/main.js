document.addEventListener('DOMContentLoaded',function(){
  const toggle=document.getElementById('menuToggle');
  const nav=document.getElementById('mainNav');
  toggle.addEventListener('click',()=>{
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Reveal on scroll
  const observer=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{if(e.isIntersecting) e.target.classList.add('reveal')});
  },{threshold:0.12});
  document.querySelectorAll('.hero-text, .card, .dept, .doctor').forEach(el=>observer.observe(el));

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',function(ev){
      const href=this.getAttribute('href');
      if(href.length>1){
        const target=document.querySelector(href);
        if(target){
          ev.preventDefault();
          target.scrollIntoView({behavior:'smooth',block:'start'});
        }
      }
      // if nav open on mobile, close it after click
      if(nav.classList.contains('open')){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false')}
    })
  });

  // Booking Page: Link doctors to department selection
  const deptSelect = document.getElementById('department');
  const docSelect = document.getElementById('doctor');
  
  if(deptSelect && docSelect){
    const doctorsByDepartment = {
      "الطوارئ": [
        { id: 5, name: "د. سامي هلال", slug: "sami-hilal", specialty: "الطوارئ" },
        { id: 6, name: "د. رانيا يوسف", slug: "rania-youssef", specialty: "الطوارئ" },
        { id: 7, name: "د. عمر فاروق", slug: "omar-farouk", specialty: "الطوارئ" }
      ],
      "أمراض القلب": [
        { id: 1, name: "د. أحمد العلي", slug: "ahmed-alali", specialty: "أمراض القلب" },
        { id: 3, name: "د. خالد عثمان", slug: "khaled-othman", specialty: "أمراض القلب" },
        { id: 4, name: "د. منى زكي", slug: "mona-zaki", specialty: "أمراض القلب" }
      ],
      "الأطفال": [
        { id: 8, name: "د. محمد سمير", slug: "mohamed-samir", specialty: "الأطفال" },
        { id: 9, name: "د. ليلى حسن", slug: "layla-hassan", specialty: "الأطفال" },
        { id: 10, name: "د. هدى علي", slug: "huda-ali", specialty: "الأطفال" }
      ],
      "الطب النفسي": [
        { id: 11, name: "د. ياسر كمال", slug: "yasser-kamal", specialty: "الطب النفسي" },
        { id: 12, name: "د. نهى سالم", slug: "noha-salem", specialty: "الطب النفسي" },
        { id: 13, name: "د. طارق محمود", slug: "tarek-mahmoud", specialty: "الطب النفسي" }
      ],
      "طب الأسنان": [
        { id: 2, name: "د. سارة النجار", slug: "sara-najjar", specialty: "طب الأسنان" },
        { id: 14, name: "د. علي العنزي", slug: "ali-alanazi", specialty: "طب الأسنان" },
        { id: 15, name: "د. بدر الحربي", slug: "bader-alharbi", specialty: "طب الأسنان" }
      ],
      "العيون": [
        { id: 16, name: "د. يوسف الزهراني", slug: "yousef-alzahrani", specialty: "العيون" },
        { id: 17, name: "د. فيصل الغامدي", slug: "faisal-alghamdi", specialty: "العيون" }
      ],
      "الجلدية": [
        { id: 18, name: "د. هدى السبيعي", slug: "huda-alsubaie", specialty: "الجلدية" },
        { id: 19, name: "د. رنا الدوسري", slug: "rana-aldosari", specialty: "الجلدية" }
      ]
    };

    const keyMap = { 'cardiology': 'أمراض القلب', 'dentistry': 'طب الأسنان', 'ophthalmology': 'العيون', 'dermatology': 'الجلدية', 'emergency': 'الطوارئ', 'pediatrics': 'الأطفال', 'psychiatry': 'الطب النفسي' };

    let currentDoctor = null;
    docSelect.disabled = true;

    // ربط القسم بالطبيب
    deptSelect.addEventListener('change', () => {
      const val = deptSelect.value.toLowerCase();
      const text = deptSelect.options[deptSelect.selectedIndex] ? deptSelect.options[deptSelect.selectedIndex].text : '';
      
      docSelect.innerHTML = '<option value="">اختر الطبيب</option>';
      docSelect.disabled = true;
      currentDoctor = null;
      
      // البحث عن القسم المطابق في القائمة الثابتة (مطابقة النص أو القيمة)
      const deptKey = keyMap[val] || Object.keys(doctorsByDepartment).find(key => 
        text.includes(key) || key.includes(text) || (val && (val.includes(key) || key.includes(val)))
      );
      
      if(deptKey && doctorsByDepartment[deptKey]){
        doctorsByDepartment[deptKey].forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = d.name + (d.specialty ? ' — ' + d.specialty : '');
          docSelect.appendChild(opt);
        });
        docSelect.disabled = false;
      }
    });

    // تثبيت الطبيب المختار
    docSelect.addEventListener('change', () => {
      const id = docSelect.value;
      if (!id) {
        currentDoctor = null;
        return;
      }
      // البحث عن الطبيب في البيانات
      for(const key in doctorsByDepartment){
        const found = doctorsByDepartment[key].find(d => d.id == id);
        if(found){
          currentDoctor = found;
          break;
        }
      }
    });
    
    // التعامل مع الرابط القادم من زر الحجز (اختيار القسم والطبيب تلقائياً)
    const params = new URLSearchParams(window.location.search);
    const docSlug = params.get('doctor');
    
    if(docSlug){
      // البحث عن القسم الذي ينتمي له الطبيب
      let targetDoctor = null;
      const foundDept = Object.keys(doctorsByDepartment).find(key => 
        (targetDoctor = doctorsByDepartment[key].find(d => d.slug === docSlug))
      );
      
      if(foundDept && targetDoctor){
        // محاولة تحديد القسم في القائمة
        for(let i=0; i<deptSelect.options.length; i++){
          const val = deptSelect.options[i].value.toLowerCase();
          const text = deptSelect.options[i].text;
          if(text.includes(foundDept) || foundDept.includes(text) || (keyMap[val] === foundDept)){
             deptSelect.selectedIndex = i;
             deptSelect.dispatchEvent(new Event('change')); // تفعيل حدث تغيير القسم لتعبئة الأطباء
             docSelect.value = targetDoctor.id;
             docSelect.dispatchEvent(new Event('change')); // تفعيل حدث اختيار الطبيب
             break;
          }
        }
      }
    }
  }
});
