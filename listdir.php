<?php
//header('Content-Type: text/html');
$lvl = $_REQUEST["lvl"];
$type = $_REQUEST["type"];

if ($type == "ob") {
    $directory = "./_assets/levels/level " . $lvl . "/ob/";
} else if ($type == "bd") {
    $directory = "./_assets/levels/level " . $lvl . "/bd/";
} else {
    echo "invalid parameter: " . $type;
}
//returns a list of files only (no directories) in a given $type folder (ob or bd)
foreach(glob($directory . "*.*") as $filename){
    //echo $filename . "\n"; //human readable
    echo $filename . "%"; //parsable
}

?>