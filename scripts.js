jQuery(document).ready(function( $) {
    var mousedown = false;
    var slider;
    var pageX;
    var pageY;

    $('#model_knob').css('transform', 'rotate(-140deg)');

    $(document).on('change', '#console', function() {
        console.log('changed');
    });

    $(document).on('mousedown', '.knob', function(e) {
        slider = $(this).data('slider');
        if (slider == '') {
            return;
        }
        pageX = e.pageX;
        pageY = e.pageY;
    }).on('mousemove mouseup', function(e) {
        if (!slider) {
            return;
        }
        var new_val = parseInt($('#'+slider).val()) + ((pageY - e.pageY) / 20);
        if (new_val > parseInt($('#'+slider).attr('max'))) {
            new_val = parseInt($('#'+slider).attr('max'));
        } else 
        if (new_val < parseInt($('#'+slider).attr('min'))) {
            new_val = parseInt($('#'+slider).attr('min'));
        }
        $('#'+slider).val(new_val).trigger('input');
        if (e.type == 'mouseup') {
            slider = false;
            return(2);
        }
    });

    $(document).on('input', '.slider', function() {
        var knob = $(this).data('knob');
        if (knob == '') {
            return; // No associated knob
        }
        var val = $(this).val();
        var deg = val * 3;
        deg = deg - 150;
        $('#'+knob).css('transform', 'rotate('+deg+'deg)');
        var value = $(this).data('value');
        if (value) {
            $('#'+value).html($(this).val());
        }
        return;

        if (val == 50) {
            $('#'+knob).css('transform', 'rotate(0deg)');
        } else 
        if (val < 50) {
            $('#'+knob).css('transform', 'rotate(-'+(val * 2)+'deg)');
        } else {
            $('#'+knob).css('transform', 'rotate('+(val * 2)+'deg)');
        }
    });

    $(document).on('click', '.led', function() {
        console.log('clicked on led');
        $(this).parent().trigger('click');
    });

    $(document).on('click', '.model_control button', function() {
        console.log($(this).attr('id'));
        $('.model_control button .led').each(function() {
            $(this).removeClass('active');
        });
        switch ($(this).attr('id')) {
            case 'classic_clean':
                $('.model_control #classic_clean .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(-140deg)');
                $('#model_select').val(1);
                break;
            case 'classic_special':
                $('.model_control #classic_special .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(-40deg)');
                $('#model_select').val(5);
                break;
            case 'classic_crunch':
                $('.model_control #classic_crunch .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(-115deg)');
                $('#model_select').val(2);
                break;
            case 'classic_high_gain':
                $('.model_control #classic_high_gain .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(-65deg)');
                $('#model_select').val(4);
                break;
            case 'classic_lead':
                $('.model_control #classic_lead .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(-90deg)');
                $('#model_select').val(3);
                break;
            case 'classic_aco':
                $('.model_control #classic_aco .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(90deg)');
                $('#model_select').val(7);
                break;
            case 'classic_bass':
                $('.model_control #classic_bass .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(65deg)');
                $('#model_select').val(6);
                break;
            case 'flat':
                $('.model_control #flat .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(115deg)');
                $('#model_select').val(8);
                break;
        }
    });

    $(document).on('input', '#model_select', function() {
        switch ($(this).val()) {
            case '1':
                $('#classic_clean').trigger('click');
                break;
            case '2': 
                $('#classic_crunch').trigger('click');
                break;
            case '3':
                $('#classic_lead').trigger('click');
                break;
            case '4':
                $('#classic_high_gain').trigger('click');
                break;
            case '5':
                $('#classic_special').trigger('click');
                break;
            case '6':
                 $('#classic_bass').trigger('click');
                break;
            case '7':
                $('#classic_aco').trigger('click');
                break;
            case '8':
                $('#flat').trigger('click');
                break;
        }
    });
});


// Basic JS functions
/**
 * Convert an array of 8 x 7 bit bytes into an array of 7 x 8 bit bytes
 * 
 * @param Array data 7 bit bytes, first being bit bucket
 * @return Array of 7 x 8 bit bytes
 */
function undo_bitbucket(data) {
    var bb = data[0];
    data.shift();
    // Convert bb to binary
    bb = parseInt(bb, 16).toString(2).padStart(data.length, '0');
    // Array to store binary data 
    var bin = [];
    data.forEach(function(d) {
        bin.push(parseInt(d, 16).toString(2).padStart(7, '0'));
    });
    // Create output array 
    var hex = [];
    bin.forEach(function(d, i) {
        hex.push(parseInt(bb[i]+d, 2).toString(16).padStart(2, '0'));
    });

    return hex;
}

/**
 * Convert an array of 7 x 8 bit bytes to a bit bucketed array of 8 x 7 bit bytes
 * 
 * @param Array data 7 x 8 bit bytes
 * @return Array of 8 x 7 bit bytes, first being bit bucket
 */
function create_bitbucket(data)
{
    // Store the binary values 
    var bin = [];
    data.forEach(function(d) {
        bin.push(parseInt(d, 16).toString(2).padStart(8, '0'));
    });
    // create binary bit bucket string
    var bin_bb = '';
    bin.forEach(function(d) {
        bin_bb = bin_bb + d[0];
    });
    // Build response
    var res = [];
    res.push(parseInt(bin_bb, 2).toString(16).padStart(2, '0'));
    bin.forEach(function(d) {
        res.push(parseInt(d.substring(1), 2).toString(16).padStart(2, '0'));
    });

    return res;
}