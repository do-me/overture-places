import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.10.1';
console.log("package load")

async function allocatePipeline() {
  let pipe = await pipeline("embeddings", "Xenova/multilingual-e5-small", {"quantized":true});

  console.log("model load")

  //let out = await pipe('I love transformers!');

  console.log("model exec")
  
  //console.log(out);
  
  window.pipe = pipe;

  console.log("model available as pipe")
  $("#spinner").attr('hidden', '');
  document.getElementById("queryData").disabled = false;

}

allocatePipeline();
